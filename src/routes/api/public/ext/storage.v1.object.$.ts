import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Compat storage proxy — a extensão MR LOV 2.2 fala com o Storage do backend
 * antigo no formato `${BASE}/storage/v1/object/<bucket>/<path>` (upload) e
 * `${BASE}/storage/v1/object/public/<bucket>/<path>` (download público).
 * Aqui redirecionamos essas chamadas para o Storage do MR Sem Limites.
 * Só o bucket `lovable-message-attachments` é aceito.
 */

const ALLOWED_BUCKET = "lovable-message-attachments";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, authorization, apikey, x-client-info, x-upsert, cache-control",
};

function parseBucketPath(splat: string): { bucket: string; path: string; isPublic: boolean } | null {
  const clean = String(splat || "").replace(/^\/+/, "");
  if (!clean) return null;
  const parts = clean.split("/");
  let isPublic = false;
  if (parts[0] === "public") {
    isPublic = true;
    parts.shift();
  }
  if (parts.length < 2) return null;
  const bucket = parts.shift()!;
  const path = parts.join("/");
  return { bucket, path, isPublic };
}

function admin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const Route = createFileRoute("/api/public/ext/storage/v1/object/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      // Upload
      POST: async ({ request, params }) => handleUpload(request, params),
      PUT: async ({ request, params }) => handleUpload(request, params),

      // Download / signed URL
      GET: async ({ request, params }) => {
        const info = parseBucketPath((params as any)._splat ?? "");
        if (!info || info.bucket !== ALLOWED_BUCKET) {
          return new Response(JSON.stringify({ error: "bucket_not_allowed" }), {
            status: 404,
            headers: { ...cors, "content-type": "application/json" },
          });
        }
        const sb = admin();
        const { data, error } = await sb.storage.from(info.bucket).download(info.path);
        if (error || !data) {
          return new Response(JSON.stringify({ error: "not_found", message: error?.message }), {
            status: 404,
            headers: { ...cors, "content-type": "application/json" },
          });
        }
        const ab = await data.arrayBuffer();
        return new Response(ab, {
          status: 200,
          headers: {
            ...cors,
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=3600",
          },
        });
      },

      DELETE: async ({ params }) => {
        const info = parseBucketPath((params as any)._splat ?? "");
        if (!info || info.bucket !== ALLOWED_BUCKET) {
          return new Response(JSON.stringify({ error: "bucket_not_allowed" }), {
            status: 404,
            headers: { ...cors, "content-type": "application/json" },
          });
        }
        const sb = admin();
        const { error } = await sb.storage.from(info.bucket).remove([info.path]);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...cors, "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...cors, "content-type": "application/json" },
        });
      },
    },
  },
});

async function handleUpload(request: Request, params: any) {
  const info = parseBucketPath(params?._splat ?? "");
  if (!info || info.bucket !== ALLOWED_BUCKET) {
    return new Response(JSON.stringify({ error: "bucket_not_allowed" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const upsert = (request.headers.get("x-upsert") ?? "").toLowerCase() === "true";

  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_UPLOAD_BYTES) {
    return new Response(JSON.stringify({ error: "too_large" }), {
      status: 413,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const sb = admin();
  const { error } = await sb.storage
    .from(info.bucket)
    .upload(info.path, buf, { contentType, upsert });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({ Key: `${info.bucket}/${info.path}`, path: info.path }),
    { status: 200, headers: { ...cors, "content-type": "application/json" } },
  );
}
