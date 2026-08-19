import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Registra uma requisição da extensão para auditoria sanitizada.
 */
export async function auditExtRequest(
  licenseId: string | null,
  route: string,
  method: string,
  statusCode: number,
  payload: any,
  correlationId?: string
) {
  try {
    // Sanitização básica: remover campos sensíveis
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

    await supabaseAdmin.from("ext_requests").insert({
      license_id: licenseId,
      route,
      method,
      status_code: statusCode,
      correlation_id: correlationId,
      payload_sanitized: sanitized
    });
  } catch (error) {
    console.error("[auditExtRequest] Failed to audit request:", error);
  }
}

/**
 * Valida a licença e o HWID.
 */
export async function validateExtLicense(licenseKey: string, hwid: string) {
  // Buscar licença
  const { data: license, error: licenseError } = await supabaseAdmin
    .from("licencas")
    .select("id, license_key, user_name, status, expires_at, max_devices")
    .eq("license_key", licenseKey)
    .single();

  if (licenseError || !license) {
    return { ok: false, error: "license_not_found" };
  }

  // Validar status
  if (license.status === "revoked") {
    return { ok: false, error: "license_revoked" };
  }

  // Validar expiração
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return { ok: false, error: "license_expired" };
  }

  // Verificar sessões/HWID
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("ext_sessions")
    .select("id, session_id")
    .eq("license_id", license.id)
    .eq("hwid", hwid)
    .single();

  if (session) {
    // HWID já vinculado
    await supabaseAdmin
      .from("ext_sessions")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", session.id);
      
    return { ok: true, license, sessionId: session.session_id };
  }

  // HWID novo - verificar limite
  const { count, error: countError } = await supabaseAdmin
    .from("ext_sessions")
    .select("id", { count: "exact", head: true })
    .eq("license_id", license.id);

  if ((count || 0) >= (license.max_devices || 1)) {
    return { ok: false, error: "hwid_limit_reached" };
  }

  // Vincular novo HWID
  const { data: newSession, error: insertError } = await supabaseAdmin
    .from("ext_sessions")
    .insert({
      license_id: license.id,
      hwid: hwid
    })
    .select("session_id")
    .single();

  if (insertError || !newSession) {
    return { ok: false, error: "session_creation_failed" };
  }

  return { ok: true, license, sessionId: newSession.session_id };
}
