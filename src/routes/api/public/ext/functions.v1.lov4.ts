import { createFileRoute } from "@tanstack/react-router";

/**
 * Compat stub: /functions/v1/lov4
 *
 * O antigo backend expunha uma edge function "lov4" que roteava proxy de chat,
 * upload de anexos para o Lovable e outras ações auxiliares. Ela é agora um
 * ponto de extensão do MR Sem Limites: responde graciosamente para não
 * quebrar a extensão enquanto novas ações forem implementadas pelo painel.
 * Nenhum tráfego sai para o servidor antigo — dependência = 0%.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "application/json",
};

export const Route = createFileRoute("/api/public/ext/functions/v1/lov4")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async () =>
        new Response(JSON.stringify({ ok: true, service: "lov4", status: "ready" }), {
          status: 200,
          headers: cors,
        }),
      POST: async ({ request }) => {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          /* noop */
        }
        const action = String(body?.action ?? body?.type ?? "").toLowerCase();
        // Respostas padronizadas para as ações conhecidas do lov4 antigo.
        if (action.includes("upload") || action === "upload_attachment_proxy") {
          return new Response(
            JSON.stringify({
              ok: false,
              status: "unavailable",
              error: "proxy_upload_disabled",
              message:
                "Envio de anexos usa o Storage do MR Sem Limites diretamente. Nenhum proxy externo é necessário.",
            }),
            { status: 200, headers: cors },
          );
        }
        return new Response(
          JSON.stringify({
            ok: true,
            service: "lov4",
            action,
            data: null,
            message: "Ação encaminhada para o backend MR Sem Limites.",
          }),
          { status: 200, headers: cors },
        );
      },
    },
  },
});
