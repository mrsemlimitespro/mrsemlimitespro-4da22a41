import { createFileRoute } from "@tanstack/react-router";
import { handleWebhook } from "@/lib/webhooks/handler.server";

export const Route = createFileRoute("/api/public/webhooks/cakto")({
  loader: async () => ({}), server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => handleWebhook("cakto", request),
    },
  },
});
