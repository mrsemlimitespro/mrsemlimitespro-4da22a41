import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/premium-cover/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as any)._splat as string;
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("premium-covers").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const ext = path.split(".").pop()?.toLowerCase();
        const contentType =
          ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "avif"
                ? "image/avif"
                : ext === "svg"
                  ? "image/svg+xml"
                  : ext === "mp4"
                    ? "video/mp4"
                    : ext === "webm"
                      ? "video/webm"
                      : ext === "jpg" || ext === "jpeg"
                        ? "image/jpeg"
                        : data.type || "application/octet-stream";

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
