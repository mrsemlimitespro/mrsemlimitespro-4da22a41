import { createFileRoute } from "@tanstack/react-router";

/**
 * Compat: /functions/v1/serve-extension-ui
 * A partir da v5.x o sidepanel usa UI direta (sem iframe); a função continua
 * exposta para manter compatibilidade e devolve um shell HTML válido.
 */
const HTML_SHELL = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>MR LOV</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a0a0f;color:#e5e7eb;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}</style></head><body><div>MR Sem Limites — Extensão ativa</div></body></html>`;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/ext/functions/v1/serve-extension-ui")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async () => new Response(HTML_SHELL, { status: 200, headers }),
    },
  },
});
