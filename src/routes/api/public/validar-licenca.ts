import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Endpoint público de validação de licenças da MR Sem Limites.
 *
 * Fluxo (retrocompatível com o shape antigo):
 *  - Busca licença pela `chave` MR
 *  - Se `tipo=teste` e ainda não iniciou, grava `trial_iniciado_em=now()` e
 *    calcula `expira_em = now() + trial_duracao_minutos`
 *  - Chama `expirar_trials_vencidos()` (lazy)
 *  - Valida limite de dispositivos (`max_dispositivos`, 0 = ilimitado);
 *    registra o dispositivo em `licenca_dispositivos`
 *  - Se houver `fornecedor_slug` + `chave_fornecedor`, chama o proxy do
 *    fornecedor server-side (nada disso vaza para o cliente)
 *  - Grava em `licenca_acessos` o resultado
 *  - Retorna { ok, premium, expires_in, expira_em, cliente_id, reason? }
 */
export const Route = createFileRoute("/api/public/validar-licenca")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "content-type": "application/json",
        };

        let body: any;
        try {
          body = await request.json();
        } catch {
          return fail(cors, "Licença inválida ou expirada.");
        }

        const email = String(body?.email ?? "").trim();
        const chave = String(body?.chave ?? "").trim();
        const device_id = body?.device_id ? String(body.device_id).trim() : null;
        const device_nome = body?.device_nome ? String(body.device_nome).slice(0, 120) : null;
        const versao = body?.versao ? String(body.versao).slice(0, 40) : null;
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        const user_agent = request.headers.get("user-agent")?.slice(0, 400) ?? null;
        // FASE 2 (multi-extensão): leitura opcional de `extension_id`. Reservado para uso futuro.
        // Enquanto ausente, o comportamento é idêntico ao atual. Nenhuma validação usa este campo aqui.
        const extension_id = body?.extension_id ? String(body.extension_id).slice(0, 80) : null;
        void extension_id;

        if (!chave) return fail(cors, "Licença inválida ou expirada.");

        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // Expira quaisquer trials vencidos (lazy)
        try {
          await sb.rpc("expirar_trials_vencidos");
        } catch {
          /* noop */
        }

        // Carrega a licença completa
        const { data: lic, error: errLic } = await sb
          .from("licencas")
          .select(
            "id, chave, email, status, tipo, trial_iniciado_em, trial_duracao_minutos, expira_em, ativada_em, duracao_dias, device_id, max_dispositivos, cliente_id, fornecedor_slug, chave_fornecedor, fornecedor_config, versao_min",
          )
          .eq("chave", chave)
          .maybeSingle();

        if (errLic || !lic) {
          await logAcesso(sb, null, chave, device_id, ip, user_agent, versao, "invalid");
          return fail(cors, "Licença inválida ou expirada.");
        }

        // E-mail (se cadastrado, precisa bater)
        if (lic.email && email && lic.email.toLowerCase() !== email.toLowerCase()) {
          await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "invalid");
          return fail(cors, "Licença inválida ou expirada.");
        }

        // Status
        if (lic.status !== "ativa") {
          await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "blocked");
          return fail(cors, "Licença inválida ou expirada.");
        }

        // Versão mínima
        if (lic.versao_min && versao && cmpVersion(versao, lic.versao_min) < 0) {
          await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "outdated");
          return fail(cors, "Versão desatualizada. Atualize a extensão.");
        }

        // Se é teste e ainda não iniciou → começa agora
        let expira_em: string | null = lic.expira_em;
        if (lic.tipo === "teste") {
          if (!lic.trial_iniciado_em) {
            const now = new Date();
            const mins = Number(lic.trial_duracao_minutos ?? 30);
            expira_em = new Date(now.getTime() + mins * 60_000).toISOString();
            await sb
              .from("licencas")
              .update({
                trial_iniciado_em: now.toISOString(),
                expira_em,
                ativada_em: now.toISOString(),
              })
              .eq("id", lic.id);
          }
          if (expira_em && new Date(expira_em).getTime() < Date.now()) {
            await sb.from("licencas").update({ status: "expirada" }).eq("id", lic.id);
            await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "trial_expired");
            return jsonResp(cors, {
              ok: false,
              valid: false,
              reason: "trial_expired",
              error: "Licença inválida ou expirada.",
            });
          }
        } else {
          // Premium: se ainda não iniciou (expira_em nulo) → inicia contagem agora usando duracao_dias
          if (!expira_em) {
            const now = new Date();
            const dias = Number(lic.duracao_dias ?? 30);
            expira_em = new Date(now.getTime() + dias * 86_400_000).toISOString();
            await sb
              .from("licencas")
              .update({
                expira_em,
                ativada_em: lic.ativada_em ?? now.toISOString(),
              })
              .eq("id", lic.id);
          }
          if (expira_em && new Date(expira_em).getTime() < Date.now()) {
            await sb.from("licencas").update({ status: "expirada" }).eq("id", lic.id);
            await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "trial_expired");
            return jsonResp(cors, {
              ok: false,
              valid: false,
              reason: "expired",
              error: "Licença inválida ou expirada.",
            });
          }
        }

        // Controle de dispositivos
        const maxDev = Number(lic.max_dispositivos ?? 1);
        if (device_id && device_id.length > 0) {
          const { data: existing } = await sb
            .from("licenca_dispositivos")
            .select("id, device_id")
            .eq("licenca_id", lic.id);
          const already = (existing ?? []).find((d) => d.device_id === device_id);
          if (already) {
            await sb
              .from("licenca_dispositivos")
              .update({ ultimo_acesso: new Date().toISOString(), ip, user_agent, device_nome })
              .eq("id", already.id);
          } else {
            if (maxDev > 0 && (existing?.length ?? 0) >= maxDev) {
              await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "device_limit");
              return jsonResp(cors, {
                ok: false,
                valid: false,
                reason: "device_limit",
                error: "Licença já está em uso em outro dispositivo.",
              });
            }
            await sb.from("licenca_dispositivos").insert({
              licenca_id: lic.id,
              device_id,
              device_nome,
              ip,
              user_agent,
            });
            // Compat: manter campo antigo device_id na primeira ativação
            if (!lic.device_id) {
              await sb.from("licencas").update({ device_id }).eq("id", lic.id);
            }
          }
        }
        await sb
          .from("licencas")
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq("id", lic.id);

        // Proxy ao fornecedor (server-side, chave nunca sai)
        if (lic.fornecedor_slug && lic.chave_fornecedor) {
          const upstream = await validarNoFornecedor(
            lic.fornecedor_slug,
            lic.chave_fornecedor,
            (lic.fornecedor_config ?? {}) as Record<string, unknown>,
          );
          if (!upstream.ok) {
            await logAcesso(
              sb,
              lic.id,
              chave,
              device_id,
              ip,
              user_agent,
              versao,
              "upstream_denied",
            );
            return jsonResp(cors, {
              ok: false,
              valid: false,
              reason: "upstream_unavailable",
              error: "Licença inválida ou expirada.",
            });
          }
        }

        await logAcesso(sb, lic.id, chave, device_id, ip, user_agent, versao, "ok");

        const expires_in = expira_em
          ? Math.max(0, Math.floor((new Date(expira_em).getTime() - Date.now()) / 1000))
          : null;

        return jsonResp(cors, {
          ok: true,
          valid: true,
          premium: lic.tipo === "premium",
          tipo: lic.tipo,
          expira_em,
          expires_in,
          cliente_id: lic.cliente_id,
        });
      },
    },
  },
});

function fail(cors: Record<string, string>, error: string) {
  return jsonResp(cors, { ok: false, valid: false, error });
}
function jsonResp(cors: Record<string, string>, body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: cors });
}

async function logAcesso(
  sb: any,
  licenca_id: string | null,
  chave: string,
  device_id: string | null,
  ip: string | null,
  user_agent: string | null,
  versao: string | null,
  resultado: string,
) {
  try {
    await sb.from("licenca_acessos").insert({
      licenca_id,
      chave,
      device_id,
      ip,
      user_agent,
      versao,
      resultado,
    });
  } catch {
    /* logging é best-effort */
  }
}

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Proxy fail-closed: valida a chave real do fornecedor server-side.
 * Adaptador `custom_http` lê endpoint/método/body do JSON `fornecedor_config`
 * — permite adicionar novos fornecedores sem código novo.
 * Outros slugs retornam ok=true (o fornecedor é apenas rótulo).
 */
async function validarNoFornecedor(
  slug: string,
  chaveFornecedor: string,
  config: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  try {
    if (slug === "custom_http") {
      const endpoint = String(config.endpoint ?? "");
      if (!endpoint) return { ok: true };
      const method = String(config.method ?? "POST").toUpperCase();
      const bodyTpl = (config.body_template as Record<string, unknown>) ?? {};
      const body = JSON.parse(JSON.stringify(bodyTpl).replaceAll("{{chave}}", chaveFornecedor));
      const resp = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body),
      });
      if (!resp.ok) return { ok: false };
      const j = await resp.json().catch(() => ({}));
      const okField = (config.ok_field as string) ?? "ok";
      const val = (j as Record<string, unknown>)[okField];
      return { ok: Boolean(val ?? true) };
    }
    // slugs pré-definidos: sem chamada upstream, apenas rótulo
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
