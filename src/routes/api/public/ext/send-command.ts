import { createFileRoute } from '@tanstack/react-router';
import { normalizeAuth, validateLicense, auditRequest, getCorsHeaders } from '@/lib/mr-ext/ext-api.server';

const MAX_BASE64_FILE_SIZE = 50 * 1024 * 1024;

function normalizeBearer(token: unknown) {
  return typeof token === 'string' ? token.replace(/^Bearer\s+/i, '').trim() : '';
}

async function relayLovableUpload(body: any, userToken: string) {
  const projectId = body.projectId || body.project_id || body.projeto_id;
  const fileName = typeof body.file_name === 'string' ? body.file_name : '';
  const contentType = typeof body.content_type === 'string' ? body.content_type : 'application/octet-stream';
  const fileData = typeof body.file_data === 'string' ? body.file_data.replace(/^data:[^;]+;base64,/, '') : '';
  if (!projectId || !fileName || !fileData) return { response: { ok: false, error: 'missing_upload_fields' }, status: 400 };

  const estimatedBytes = Math.floor((fileData.length * 3) / 4);
  if (estimatedBytes > MAX_BASE64_FILE_SIZE) return { response: { ok: false, error: 'file_too_large' }, status: 400 };

  let fileBytes: Uint8Array;
  try {
    const binary = atob(fileData);
    fileBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return { response: { ok: false, error: 'invalid_file_data' }, status: 400 };
  }

  const upstreamHeaders = {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://lovable.dev',
    'Referer': 'https://lovable.dev/',
    'x-lovable-project-id': String(projectId),
  };
  const createResponse = await fetch(`https://api.lovable.dev/projects/${projectId}/files/generate-upload-url`, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({
      content_type: contentType,
      original_file_name: fileName,
      file_size_bytes: fileBytes.byteLength,
      original_file_size_bytes: fileBytes.byteLength,
    }),
  });
  const createData = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok) return { response: createData, status: createResponse.status };

  const signedUrl = createData.url || createData.signed_url || createData.signedUrl;
  const fileId = createData.file_id;
  if (!signedUrl || !fileId) return { response: { ok: false, error: 'lovable_upload_url_missing' }, status: 502 };

  const uploadHeaders: Record<string, string> = { 'Content-Type': contentType };
  for (const [header, value] of Object.entries(createData.headers || {})) {
    if (typeof value === 'string' && /^x-goog-/i.test(header)) uploadHeaders[header] = value;
  }
  const uploadResponse = await fetch(signedUrl, { method: 'PUT', headers: uploadHeaders, body: fileBytes });
  if (!uploadResponse.ok) return { response: { ok: false, error: 'lovable_file_upload_failed' }, status: uploadResponse.status };

  const fileIdPart = String(fileId).split('/').pop();
  const downloadResponse = await fetch('https://api.lovable.dev/files/generate-download-url', {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({ dir_name: projectId, file_name: fileIdPart }),
  });
  const downloadData = await downloadResponse.json().catch(() => ({}));
  const downloadUrl = downloadData.url || downloadData.download_url || downloadData.signed_url || downloadData.signedUrl || null;

  return {
    status: 200,
    response: { ok: true, file_id: fileId, file_name: fileName, download_url: downloadUrl, mime_type: contentType },
  };
}

export const Route = createFileRoute('/api/public/ext/send-command')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: getCorsHeaders(request) }),
      POST: async ({ request }) => {
        const cors = getCorsHeaders(request);
        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        const { licenseKey, hwid } = normalizeAuth(body);
        const userToken = normalizeBearer(body.token_lovable || body.token || request.headers.get('Authorization'));
        const projectId = body.projectId || body.project_id || body.projeto_id;

        if (!licenseKey || !hwid || !userToken || !projectId) {
          return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        const result = await validateLicense(licenseKey, hwid);
        await auditRequest(result.license?.id || null, '/api/ext/send-command', 'POST', result.valid ? 200 : 403, body);

        if (!result.valid) {
          return new Response(JSON.stringify({ ok: false, error: result.error }), {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        if (body.action === 'upload') {
          try {
            const upload = await relayLovableUpload(body, userToken);
            return new Response(JSON.stringify(upload.response), {
              status: upload.status,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          } catch (error) {
            console.error('[send-command] Lovable attachment relay failed:', error);
            return new Response(JSON.stringify({ ok: false, error: 'upstream_failed' }), {
              status: 502,
              headers: { ...cors, 'Content-Type': 'application/json' },
            });
          }
        }

        // O payload do motor é preservado integralmente; somente dados de
        // autenticação interna do MR são removidos antes da chamada upstream.
        const motorPayload = body.lastPayload ?? body.payload ?? body;
        const upstreamPayload = { ...motorPayload };
        delete upstreamPayload.license_key;
        delete upstreamPayload.licenseKey;
        delete upstreamPayload.key;
        delete upstreamPayload.chave;
        delete upstreamPayload.hwid;
        delete upstreamPayload.device_id;

        try {
          const upstreamResponse = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream, application/json',
            },
            body: JSON.stringify(upstreamPayload),
          });

          const responseHeaders = new Headers(cors);
          const contentType = upstreamResponse.headers.get('Content-Type');
          if (contentType) responseHeaders.set('Content-Type', contentType);
          if (contentType?.includes('text/event-stream')) {
            return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
          }

          return new Response(await upstreamResponse.text(), { status: upstreamResponse.status, headers: responseHeaders });
        } catch (error) {
          console.error('[send-command] Upstream error:', error);
          return new Response(JSON.stringify({ ok: false, error: 'upstream_failed' }), {
            status: 502,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
