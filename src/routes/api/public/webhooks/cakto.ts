import { createFileRoute } from "@tanstack/react-router";
import { handleWebhook } from "@/lib/webhooks/handler.server";

export const Route = createFileRoute("/api/public/webhooks/cakto")({
  server: {
    handlers: {
      POST: async ({ request }) => handleWebhook("cakto", request),
    },
  },
});
