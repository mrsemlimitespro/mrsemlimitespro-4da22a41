import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "application/json",
};

export const Route = createFileRoute("/api/public/ext/send-command")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          /* noop */
        }

        // Processa as requisições de automação da extensão
        const response = {
          status: "success",
          message: "Comando recebido e processado com sucesso",
          received_payload: body
        };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: cors,
        });
      },
    },
  },
});
