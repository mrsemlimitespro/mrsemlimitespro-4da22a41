import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function auditExtRequest(
  licenseId: string | null,
  route: string,
  method: string,
  statusCode: number,
  payload: any
) {
  try {
    const sanitized = { ...payload };
    const sensitiveFields = ['token', 'authorization', 'bearer', 'password', 'secret', 'apiKey', 'key'];
    
    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    };

    sanitizeObject(sanitized);

    // Tentamos inserir na tabela de auditoria se ela existir
    try {
      await supabaseAdmin.from("ext_requests").insert({
        license_id: licenseId,
        route,
        method,
        status_code: statusCode,
        payload_sanitized: sanitized
      });
    } catch (e) {
      // Fallback: log no console se a tabela ainda não existir
      console.log("[EXT-AUDIT]", { licenseId, route, method, statusCode, sanitized });
    }
  } catch (error) {
    console.error("[auditExtRequest] Failed:", error);
  }
}
