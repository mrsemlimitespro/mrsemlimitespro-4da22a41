/**
 * Server functions administrativas para gestão de revendedores.
 *
 * Fluxos suportados:
 *  - createRevendedorManual: cria auth.user (Admin API) + registro em revendedores.
 *      Aceita senha temporária opcional (marca must_change_password=true) ou
 *      envia Magic Link imediatamente.
 *  - setRevendedorBloqueio / setRevendedorValidade
 *  - resendMagicLinkRevendedor
 *  - resetRevendedorPassword: reenvia link de recuperação de senha
 *  - deleteRevendedor: soft delete
 *  - completePasswordChange: chamada pelo próprio revendedor após trocar a senha
 *
 * Todas as funções admin exigem role admin (via `has_role`). Auditoria via `log_audit`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/premium-packs/_guard";

const emailSchema = z
  .string()
  .email()
  .max(320)
  .transform((v) => v.toLowerCase().trim());

const nomeSchema = z.string().trim().min(2).max(120);

// ------------------------------ Criar manual ------------------------------
export const createRevendedorManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nome: nomeSchema,
        email: emailSchema,
        whatsapp: z.string().trim().max(40).optional().nullable(),
        empresa: z.string().trim().max(160).optional().nullable(),
        cpf_cnpj: z.string().trim().max(32).optional().nullable(),
        observacoes: z.string().max(1000).optional().nullable(),
        status: z.enum(["ativo", "pendente", "inativo"]).default("ativo"),
        validade_dias: z
          .number()
          .int()
          .min(1)
          .max(3650)
          .optional()
          .nullable(),
        vitalicio: z.boolean().optional().default(false),
        // Nova senha temporária (definida pelo admin) — força troca no primeiro acesso.
        senha_temporaria: z.string().min(6).max(64).optional().nullable(),
        enviarMagicLink: z.boolean().optional().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = data.senha_temporaria?.trim() || null;

    // 1. Localiza/cria auth user (com senha temporária, se informada)
    const admin = (supabaseAdmin as unknown as { auth: { admin: any } }).auth.admin;
    let userId: string | null = null;
    try {
      const { data: list } = await admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find(
        (u: any) => (u.email ?? "").toLowerCase() === data.email,
      );
      if (existing) {
        userId = existing.id;
        // Atualiza senha do usuário existente, se admin informou uma
        if (tempPassword) {
          try {
            await admin.updateUserById(existing.id, { password: tempPassword });
          } catch {
            /* ignore */
          }
        }
      } else {
        const { data: created, error: cErr } = await admin.createUser({
          email: data.email,
          email_confirm: true,
          password: tempPassword ?? undefined,
          user_metadata: { nome: data.nome, origem: "admin-manual" },
        });
        if (cErr) throw new Error(cErr.message);
        userId = created?.user?.id ?? null;
      }
    } catch (e: any) {
      throw new Error(`auth-admin: ${e?.message ?? e}`);
    }

    // 2. Calcula expira_em
    let expira_em: string | null = null;
    if (!data.vitalicio && data.validade_dias) {
      expira_em = new Date(
        Date.now() + data.validade_dias * 86400_000,
      ).toISOString();
    }

    // 3. Upsert revendedor (por email)
    const { data: existente } = await supabaseAdmin
      .from("revendedores")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    const basePayload: Record<string, unknown> = {
      nome: data.nome,
      auth_user_id: userId,
      whatsapp: data.whatsapp ?? null,
      empresa: data.empresa ?? null,
      cpf_cnpj: data.cpf_cnpj ?? null,
      observacoes: data.observacoes ?? null,
      status: data.status,
      bloqueado: data.status === "inativo",
      plano_expira_em: expira_em,
      must_change_password: !!tempPassword,
      temp_password_sent_at: tempPassword ? new Date().toISOString() : null,
      deleted_at: null,
    };

    let revendedorId: string;
    if (existente?.id) {
      const { error: uErr } = await supabaseAdmin
        .from("revendedores")
        .update(basePayload as never)
        .eq("id", existente.id);
      if (uErr) throw new Error(uErr.message);
      revendedorId = existente.id;
    } else {
      const { data: novo, error: iErr } = await supabaseAdmin
        .from("revendedores")
        .insert({
          ...basePayload,
          email: data.email,
          saldo_creditos: 0,
        } as never)
        .select("id")
        .single();
      if (iErr) throw new Error(iErr.message);
      revendedorId = novo.id;
    }

    // 4. Auditoria
    await supabaseAdmin.rpc("log_audit", {
      _acao: "criar_revendedor_manual",
      _entidade: "revendedor",
      _entidade_id: revendedorId,
      _antes: null,
      _depois: null,
      _metadata: {
        email: data.email,
        vitalicio: !!data.vitalicio,
        validade_dias: data.validade_dias ?? null,
        com_senha_temporaria: !!tempPassword,
      } as never,
    } as never);

    // 5a. Email de boas-vindas com senha temporária (se admin definiu uma)
    let magicLink: string | null = null;
    if (tempPassword) {
      await enqueueTempPasswordEmail(supabaseAdmin, {
        email: data.email,
        nome: data.nome,
        senha: tempPassword,
        revendedorId,
      });
    } else if (data.enviarMagicLink) {
      // 5b. Magic Link (fluxo padrão)
      const { provisionRevendedor } = await import(
        "@/lib/revendedores/provision.server"
      );
      const res = await provisionRevendedor({
        email: data.email,
        nome: data.nome,
        amount: null,
        externalId: null,
      });
      magicLink = res.magicLink ?? null;
    }

    return { ok: true, revendedorId, magicLink };
  });

// ---------------------------- Bloquear / Desbloquear ----------------------------
export const setRevendedorBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        bloqueado: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("revendedores")
      .update({
        bloqueado: data.bloqueado,
        status: data.bloqueado ? "inativo" : "ativo",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("log_audit", {
      _acao: data.bloqueado ? "bloquear_revendedor" : "desbloquear_revendedor",
      _entidade: "revendedor",
      _entidade_id: data.id,
      _antes: null,
      _depois: null,
      _metadata: {} as never,
    } as never);
    return { ok: true };
  });

// ------------------------------- Validade ---------------------------------
export const setRevendedorValidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        dias: z.number().int().min(1).max(3650).nullable(),
        modo: z.enum(["definir", "adicionar"]).default("definir"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let novaData: string | null = null;
    if (data.dias === null) {
      novaData = null;
    } else if (data.modo === "adicionar") {
      const { data: atual } = await supabaseAdmin
        .from("revendedores")
        .select("plano_expira_em")
        .eq("id", data.id)
        .maybeSingle();
      const base = atual?.plano_expira_em
        ? Math.max(new Date(atual.plano_expira_em).getTime(), Date.now())
        : Date.now();
      novaData = new Date(base + data.dias * 86400_000).toISOString();
    } else {
      novaData = new Date(Date.now() + data.dias * 86400_000).toISOString();
    }

    const { error } = await supabaseAdmin
      .from("revendedores")
      .update({ plano_expira_em: novaData })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("log_audit", {
      _acao:
        data.dias === null
          ? "vitalicio_revendedor"
          : data.modo === "adicionar"
            ? "renovar_revendedor"
            : "definir_validade_revendedor",
      _entidade: "revendedor",
      _entidade_id: data.id,
      _antes: null,
      _depois: null,
      _metadata: { dias: data.dias, modo: data.modo } as never,
    } as never);

    return { ok: true, plano_expira_em: novaData };
  });

// ------------------------- Reenviar magic link -------------------------
export const resendMagicLinkRevendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rev } = await supabaseAdmin
      .from("revendedores")
      .select("id,email,nome")
      .eq("id", data.id)
      .maybeSingle();
    if (!rev?.email) throw new Error("Revendedor sem email cadastrado.");

    await supabaseAdmin
      .from("email_queue")
      .update({ status: "canceled" } as never)
      .eq("template_chave", "revendedor.boas-vindas")
      .eq("destinatario", rev.email.toLowerCase())
      .in("status", ["pending", "sent"]);

    const { provisionRevendedor } = await import(
      "@/lib/revendedores/provision.server"
    );
    const res = await provisionRevendedor({
      email: rev.email,
      nome: rev.nome ?? null,
      amount: null,
      externalId: null,
    });

    await supabaseAdmin.rpc("log_audit", {
      _acao: "reenviar_magic_link",
      _entidade: "revendedor",
      _entidade_id: data.id,
      _antes: null,
      _depois: null,
      _metadata: { email: rev.email } as never,
    } as never);

    return { ok: res.ok, magicLink: res.magicLink ?? null };
  });

// ------------------------- Reset de senha (recovery) -------------------------
export const resetRevendedorPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rev } = await supabaseAdmin
      .from("revendedores")
      .select("id,email,nome")
      .eq("id", data.id)
      .maybeSingle();
    if (!rev?.email) throw new Error("Revendedor sem email cadastrado.");

    // Marca must_change_password
    await supabaseAdmin
      .from("revendedores")
      .update({ must_change_password: true } as never)
      .eq("id", data.id);

    // Gera link de recovery e envia email
    let recoveryLink = "";
    try {
      const admin = (supabaseAdmin as unknown as { auth: { admin: any } }).auth.admin;
      const { data: linkData } = await admin.generateLink({
        type: "recovery",
        email: rev.email,
        options: {
          redirectTo: "https://mrsemlimites.lovable.app/redefinir-senha",
        },
      });
      recoveryLink =
        linkData?.properties?.action_link || linkData?.action_link || "";
    } catch {
      /* ignore */
    }

    await enqueueResetEmail(supabaseAdmin, {
      email: rev.email,
      nome: rev.nome ?? null,
      recoveryLink,
      revendedorId: rev.id,
    });

    await supabaseAdmin.rpc("log_audit", {
      _acao: "reset_senha_revendedor",
      _entidade: "revendedor",
      _entidade_id: data.id,
      _antes: null,
      _depois: null,
      _metadata: { email: rev.email } as never,
    } as never);

    return { ok: true, recoveryLink };
  });

// ------------------------- Soft delete -------------------------
export const deleteRevendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("revendedores")
      .update({
        deleted_at: new Date().toISOString(),
        bloqueado: true,
        status: "inativo",
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("log_audit", {
      _acao: "excluir_revendedor",
      _entidade: "revendedor",
      _entidade_id: data.id,
      _antes: null,
      _depois: null,
      _metadata: {} as never,
    } as never);
    return { ok: true };
  });

// ------- Chamada pelo próprio revendedor após trocar a senha (primeiro login) -------
export const completePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rev } = await supabaseAdmin
      .from("revendedores")
      .select("id,email,nome,must_change_password")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!rev?.id) return { ok: true, changed: false };

    await supabaseAdmin
      .from("revendedores")
      .update({
        must_change_password: false,
        temp_password_sent_at: null,
      } as never)
      .eq("id", rev.id);

    await supabaseAdmin.rpc("log_audit", {
      _acao: "trocar_senha_revendedor",
      _entidade: "revendedor",
      _entidade_id: rev.id,
      _antes: null,
      _depois: null,
      _metadata: {} as never,
    } as never);

    if (rev.email) {
      await enqueuePasswordChangedEmail(supabaseAdmin, {
        email: rev.email,
        nome: rev.nome ?? null,
        revendedorId: rev.id,
      });
    }

    return { ok: true, changed: true };
  });

// ============================ Emails helpers ============================
async function enqueueTempPasswordEmail(
  supabaseAdmin: any,
  v: { email: string; nome: string; senha: string; revendedorId: string },
) {
  const linkPortal = "https://mrsemlimites.lovable.app/redefinir-senha";
  const assunto = "MR Sem Limites — Acesso ao Painel do Revendedor";
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#e6e6ea;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#12121a;border:1px solid #2a2a35;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 8px 0;font-size:22px">Olá, ${escapeHtml(v.nome)} 👋</h1>
    <p style="color:#b3b3c0">Sua conta de revendedor foi criada. Use os dados abaixo para o primeiro acesso:</p>
    <div style="background:#0b0b12;border:1px solid #2a2a35;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:4px 0"><strong>Login:</strong> ${escapeHtml(v.email)}</p>
      <p style="margin:4px 0"><strong>Senha temporária:</strong> <code style="background:#2a2a35;padding:2px 6px;border-radius:4px">${escapeHtml(v.senha)}</code></p>
    </div>
    <p style="margin:16px 0"><a href="${linkPortal}" style="display:inline-block;background:linear-gradient(135deg,#d946ef,#3b82f6);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Acessar o painel</a></p>
    <p style="color:#f59e0b;font-size:13px"><strong>Importante:</strong> por segurança, você será obrigado(a) a criar uma nova senha no primeiro acesso.</p>
  </div></body></html>`;
  await supabaseAdmin.from("email_queue").insert({
    destinatario: v.email,
    destinatario_nome: v.nome,
    assunto,
    html,
    texto: `Login: ${v.email}\nSenha temporária: ${v.senha}\nAcesse: ${linkPortal}\nVocê deverá criar uma nova senha no primeiro acesso.`,
    template_chave: "revendedor.senha-temporaria",
    revendedor_id: v.revendedorId,
    metadata: { origem: "admin-manual" } as never,
  });
}

async function enqueueResetEmail(
  supabaseAdmin: any,
  v: { email: string; nome: string | null; recoveryLink: string; revendedorId: string },
) {
  const nome = v.nome || v.email.split("@")[0];
  const link = v.recoveryLink || "https://mrsemlimites.lovable.app/redefinir-senha";
  await supabaseAdmin.from("email_queue").insert({
    destinatario: v.email,
    destinatario_nome: nome,
    assunto: "MR Sem Limites — Redefinição de senha",
    html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#e6e6ea;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#12121a;border:1px solid #2a2a35;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 8px 0;font-size:20px">Redefina sua senha</h1>
    <p>Olá, ${escapeHtml(nome)} — clique no botão abaixo para criar uma nova senha:</p>
    <p style="margin:16px 0"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#d946ef,#3b82f6);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Redefinir senha</a></p>
    <p style="font-size:12px;color:#8a8a95">Se você não solicitou, ignore este email.</p>
  </div></body></html>`,
    texto: `Redefina sua senha: ${link}`,
    template_chave: "revendedor.reset-senha",
    revendedor_id: v.revendedorId,
  });
}

async function enqueuePasswordChangedEmail(
  supabaseAdmin: any,
  v: { email: string; nome: string | null; revendedorId: string },
) {
  const nome = v.nome || v.email.split("@")[0];
  await supabaseAdmin.from("email_queue").insert({
    destinatario: v.email,
    destinatario_nome: nome,
    assunto: "MR Sem Limites — Sua senha foi alterada",
    html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#e6e6ea;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#12121a;border:1px solid #2a2a35;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 8px 0;font-size:20px">Senha alterada com sucesso ✅</h1>
    <p>Olá, ${escapeHtml(nome)} — confirmamos que sua senha foi trocada com sucesso.</p>
    <p style="font-size:12px;color:#f59e0b">Se não foi você, entre em contato com o suporte imediatamente.</p>
  </div></body></html>`,
    texto: `Sua senha foi alterada com sucesso. Se não foi você, contate o suporte.`,
    template_chave: "revendedor.senha-alterada",
    revendedor_id: v.revendedorId,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
