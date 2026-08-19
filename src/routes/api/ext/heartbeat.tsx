import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { validateExtLicense, auditExtRequest } from '@/lib/ext-v17/ext-api.server';

const requestSchema = z.object({
  license_key: z.string().optional(),
  licenseKey: z.string().optional(),
  key: z.string().optional(),
  user_license_key: z.string().optional(),
  hwid: z.string().optional(),
  device_id: z.string().optional(),
});

export const Route = createFileRoute('/api/ext/heartbeat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const parsed = requestSchema.safeParse(body);
          
          if (!parsed.success) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_format" }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const { license_key, licenseKey, key, user_license_key, hwid, device_id } = parsed.data;
          const finalKey = license_key || licenseKey || key || user_license_key;
          const finalHwid = hwid || device_id;

          if (!finalKey || !finalHwid) {
            return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          const result = await validateExtLicense(finalKey, finalHwid);
          
          await auditExtRequest(
            result.ok && result.license ? result.license.id : null,
            '/api/ext/heartbeat',
            'POST',
            result.ok ? 200 : 403,
            body
          );

          if (!result.ok || !result.license) {
            return new Response(JSON.stringify({ ok: false, error: result.error || "license_not_found" }), { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          return new Response(JSON.stringify({
            ok: true,
            valid: true,
            licenca_id: result.license.id,
            status: result.license.status,
            expires_at: result.license.expires_at,
            hwid: finalHwid,
            session_id: result.sessionId
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error("[heartbeat] Error:", error);
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  }
});
