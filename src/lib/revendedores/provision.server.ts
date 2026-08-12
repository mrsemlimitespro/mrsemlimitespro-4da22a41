/**
 * Auto-provisão de revendedor após pagamento aprovado na Kiwify.
 *
 * Fluxo (idempotente):
 *  1. Localiza/cria o usuário em auth.users (via Admin API).
 *  2. Faz upsert do registro em `revendedores` (chave: email).
 *  3. Gera o Magic Link (`admin.auth.admin.generateLink`).
 *  4. Enfileira o email de boas-vindas contendo:
 *       - Magic Link de acesso
 *       - Link da comunidade
 *       - Link do painel / suporte
 *
 * Não emite crédito, não gera comissão. Apenas libera o painel.
 */
export type ProvisionInput = {
  email: string;
  nome: string | null;
  amount: number | null;
  externalId: string | null;
};

export type ProvisionResult = {
  ok: boolean;
  reason: string;
  revendedorId?: string;
  magicLink?: string;
  emailQueued?: boolean;
};

export async function provisionRevendedor(input: ProvisionInput): Promise<ProvisionResult> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "missing-email" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Config (links + remetente)
  const { data: settings } = await supabaseAdmin
    .from("admin_settings")
    .select(
      "link_comunidade,email_link_portal,email_link_suporte,email_link_manual,email_remetente_nome",
    )
    .limit(1)
    .maybeSingle();

  const s = (settings ?? {}) as Record<string, string | null>;
  const linkPortal = s.email_link_portal || "https://mrsemlimites.lovable.app/revendedor";
  const linkComunidade = s.link_comunidade || "";
  const linkSuporte = s.email_link_suporte || "";
  const linkManual = s.email_link_manual || "";

  // 2. Auth user
  let userId: string | null = null;
  try {
    const admin = (supabaseAdmin as unknown as { auth: { admin: any } }).auth.admin;
    // listUsers com paginação básica; suficiente para lookup por email
    const { data: list } = await admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cErr } = await admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nome: input.nome ?? undefined, origem: "kiwify-revendedor" },
      });
      if (cErr) return { ok: false, reason: `create-user:${cErr.message}` };
      userId = created?.user?.id ?? null;
    }
  } catch (e: any) {
    return { ok: false, reason: `auth-admin:${e?.message ?? e}` };
  }

  // 3. Upsert revendedor (por email)
  const nome = input.nome || email.split("@")[0];
  const { data: existingRev } = await supabaseAdmin
    .from("revendedores")
    .select("id,auth_user_id,status,bloqueado")
    .eq("email", email)
    .maybeSingle();

  let revendedorId = existingRev?.id ?? null;

  if (!revendedorId) {
    const { data: novo, error: rErr } = await supabaseAdmin
      .from("revendedores")
      .insert({
        nome,
        email,
        auth_user_id: userId,
        status: "ativo",
        bloqueado: false,
      })
      .select("id")
      .single();
    if (rErr) return { ok: false, reason: `insert-revendedor:${rErr.message}` };
    revendedorId = novo.id;
  } else {
    await supabaseAdmin
      .from("revendedores")
      .update({
        auth_user_id: existingRev?.auth_user_id ?? userId,
        status: "ativo",
        bloqueado: false,
      })
      .eq("id", revendedorId);
  }

  // 4. Magic Link
  let magicLink = linkPortal;
  try {
    const admin = (supabaseAdmin as unknown as { auth: { admin: any } }).auth.admin;
    const { data: linkData } = await admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: linkPortal },
    });
    magicLink =
      linkData?.properties?.action_link ||
      linkData?.action_link ||
      linkPortal;
  } catch {
    /* fallback: envia link do portal simples */
  }

  // 5. Enfileira email de boas-vindas
  const remetente = s.email_remetente_nome || "MR Sem Limites";
  const assunto = `${remetente} — Bem-vindo(a) ao Painel do Revendedor!`;
  const html = renderWelcomeHtml({
    nome,
    magicLink,
    linkComunidade,
    linkPortal,
    linkSuporte,
    linkManual,
  });
  const texto = renderWelcomeText({
    nome,
    magicLink,
    linkComunidade,
    linkPortal,
    linkSuporte,
  });

  // Evita reenviar welcome se já existir um na fila para esse revendedor
  const { data: existingWelcome } = await supabaseAdmin
    .from("email_queue")
    .select("id")
    .eq("template_chave", "revendedor.boas-vindas")
    .eq("destinatario", email)
    .in("status", ["pending", "sending", "sent"])
    .limit(1);
  if (existingWelcome && existingWelcome.length > 0) {
    return {
      ok: true,
      reason: "already-provisioned",
      revendedorId: revendedorId ?? undefined,
      magicLink,
      emailQueued: false,
    };
  }

  const { error: qErr } = await supabaseAdmin.from("email_queue").insert({
    destinatario: email,
    destinatario_nome: nome,
    assunto,
    html,
    texto,
    template_chave: "revendedor.boas-vindas",
    revendedor_id: revendedorId,
    metadata: {
      origem: "kiwify",
      external_id: input.externalId,
      amount: input.amount,
    } as never,
    variables: {
      nome,
      magic_link: magicLink,
      link_comunidade: linkComunidade,
      link_portal: linkPortal,
    } as never,
  });

  return {
    ok: true,
    reason: "provisioned",
    revendedorId: revendedorId ?? undefined,
    magicLink,
    emailQueued: !qErr,
  };
}

function renderWelcomeHtml(v: {
  nome: string;
  magicLink: string;
  linkComunidade: string;
  linkPortal: string;
  linkSuporte: string;
  linkManual: string;
}) {
  const comunidade = v.linkComunidade
    ? `<p style="margin:16px 0"><strong>Comunidade oficial:</strong> <a href="${v.linkComunidade}">${v.linkComunidade}</a></p>`
    : "";
  const suporte = v.linkSuporte
    ? `<p style="margin:4px 0">Suporte: <a href="${v.linkSuporte}">${v.linkSuporte}</a></p>`
    : "";
  const manual = v.linkManual
    ? `<p style="margin:4px 0">Manual: <a href="${v.linkManual}">${v.linkManual}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#e6e6ea;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#12121a;border:1px solid #2a2a35;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 8px 0;font-size:22px">Olá, ${escapeHtml(v.nome)} 👋</h1>
    <p style="margin:0 0 16px 0;color:#b3b3c0">Sua conta de revendedor foi liberada com sucesso.</p>
    <p style="margin:16px 0">
      <a href="${v.magicLink}" style="display:inline-block;background:linear-gradient(135deg,#d946ef,#3b82f6);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">
        Acessar meu painel
      </a>
    </p>
    <p style="margin:8px 0 16px 0;font-size:12px;color:#8a8a95">
      Este é um link de acesso direto (Magic Link). Se preferir, cole no navegador:<br>
      <span style="word-break:break-all">${v.magicLink}</span>
    </p>
    ${comunidade}
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #2a2a35;font-size:13px;color:#b3b3c0">
      <p style="margin:0 0 8px 0"><strong>Primeiros passos:</strong></p>
      <ol style="margin:0;padding-left:20px">
        <li>Clique no botão acima para entrar no painel.</li>
        <li>Cadastre seus clientes e gere licenças ilimitadas.</li>
        <li>Defina seus próprios preços — 100% do lucro é seu.</li>
        <li>Entre na comunidade para novidades e suporte.</li>
      </ol>
    </div>
    <div style="margin-top:20px;font-size:12px;color:#8a8a95">
      <p style="margin:8px 0">Painel: <a href="${v.linkPortal}">${v.linkPortal}</a></p>
      ${suporte}
      ${manual}
    </div>
  </div>
</body></html>`;
}

function renderWelcomeText(v: {
  nome: string;
  magicLink: string;
  linkComunidade: string;
  linkPortal: string;
  linkSuporte: string;
}) {
  return [
    `Olá, ${v.nome}!`,
    ``,
    `Sua conta de revendedor foi liberada.`,
    ``,
    `Acesse seu painel: ${v.magicLink}`,
    v.linkComunidade ? `Comunidade: ${v.linkComunidade}` : "",
    v.linkSuporte ? `Suporte: ${v.linkSuporte}` : "",
    ``,
    `Primeiros passos:`,
    `1. Entre no painel pelo link acima.`,
    `2. Cadastre seus clientes e gere licenças.`,
    `3. Defina seus preços — 100% do lucro é seu.`,
    `4. Entre na comunidade oficial.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
