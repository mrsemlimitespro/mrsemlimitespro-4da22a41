import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ExtLicenseData {
  id: string;
  license_key: string;
  user_name: string;
  email: string | null;
  status: 'active' | 'revoked' | 'trial';
  expires_at: string | null;
  max_devices: number;
}

export interface ExtSession {
  id: string;
  license_id: string;
  hwid: string;
  session_id: string;
  last_seen: string;
}

/**
 * ID derivado da chave pública incluída no manifesto da distribuição MR Sem
 * Limites. Não é segredo; a variável de ambiente pode sobrescrevê-lo em uma
 * distribuição futura assinada com outra chave.
 */
export const DEFAULT_MR_EXTENSION_ORIGIN = 'chrome-extension://pmnjaeibfnakhpcbmfgnondcobbhhjap';

/**
 * Normaliza e extrai chave e HWID dos possíveis aliases
 */
export function normalizeAuth(body: any) {
  const key = body.license_key || body.licenseKey || body.key || body.user_license_key || body.chave;
  const hwid = body.hwid || body.device_id || body.deviceId;
  return { 
    licenseKey: typeof key === 'string' ? key.trim() : null, 
    hwid: typeof hwid === 'string' ? hwid.trim() : null 
  };
}

/**
 * Valida o formato da licença MR-XXXX-XXXX-XXXX
 */
export function validateKeyFormat(key: string | null): boolean {
  if (!key) return false;
  return /^([A-Z0-9]{2}-)?MR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}(-[A-Z0-9]{4})?$/.test(key);
}

/**
 * Valida licença, status, expiração e HWID
 */
export async function validateLicense(licenseKey: string, hwid: string) {
  const { data: lic, error } = await supabaseAdmin
    .from('licencas')
    .select('id, license_key, user_name, email, status, expires_at, max_devices')
    .eq('license_key', licenseKey)
    .maybeSingle();

  if (error || !lic) return { valid: false, error: 'license_not_found' };
  
  if (lic.status === 'revoked') return { valid: false, error: 'license_revoked' };
  
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    return { valid: false, error: 'license_expired' };
  }

  // Verificar sessões existentes para este HWID
  const { data: existingSession } = await supabaseAdmin
    .from('ext_sessions')
    .select('id, session_id, last_seen')
    .eq('license_id', lic.id)
    .eq('hwid', hwid)
    .maybeSingle();

  if (existingSession) {
    // Atualizar last_seen
    await supabaseAdmin
      .from('ext_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existingSession.id);
      
    return { valid: true, license: lic, session: existingSession };
  }

  // Verificar limite de dispositivos
  const { count } = await supabaseAdmin
    .from('ext_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('license_id', lic.id);

  if ((count || 0) >= (lic.max_devices ?? 1)) {
    return { valid: false, error: 'hwid_limit_reached' };
  }

  // Criar nova sessão
  const sessionId = crypto.randomUUID();
  const { data: newSession, error: sessionErr } = await supabaseAdmin
    .from('ext_sessions')
    .insert({
      license_id: lic.id,
      hwid,
      session_id: sessionId,
      last_seen: new Date().toISOString()
    })
    .select('id, license_id, hwid, session_id, last_seen')
    .single();

  if (sessionErr) return { valid: false, error: 'session_creation_failed' };

  return { valid: true, license: lic, session: newSession };
}

/**
 * Mantém o contrato atual e adiciona aliases lidos pelo cliente legado.
 * A sessão usa `status === "valid"`; o estado comercial permanece em
 * `license_status` e `type`.
 */
export function buildExtensionLicenseResponse(
  license: ExtLicenseData,
  session: Pick<ExtSession, 'session_id' | 'last_seen'>,
  hwid: string
) {
  return {
    ok: true,
    valid: true,
    status: 'valid',
    license_status: license.status,
    licenca_id: license.id,
    license_key: license.license_key,
    user_name: license.user_name,
    customer_name: license.user_name,
    expires_at: license.expires_at,
    hwid,
    session_id: session.session_id,
    session_token: session.session_id,
    last_seen: session.last_seen,
    max_devices: license.max_devices,
    type: license.status,
  };
}

/**
 * Sanitiza auditoria removendo tokens e segredos recursivamente
 */
export function sanitizeAudit(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  
  const sensitiveFields = ['authorization', 'token', 'bearer', 'password', 'secret', 'apikey', 'key', 'license_key', 'licensekey', 'user_license_key', 'chave'];
  
  const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(f => lowerKey.includes(f))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeAudit(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Grava auditoria de requisição
 */
export async function auditRequest(
  licenseId: string | null,
  route: string,
  method: string,
  statusCode: number,
  payload: any,
  correlationId?: string
) {
  try {
    const sanitized = sanitizeAudit(payload);
    await supabaseAdmin.from('ext_requests').insert({
      license_id: licenseId,
      route,
      method,
      status_code: statusCode,
      correlation_id: correlationId,
      payload_sanitized: sanitized
    });
  } catch (e) {
    console.error('[auditRequest] Failed:', e);
  }
}

/**
 * Retorna os headers de CORS padronizados para as rotas públicas da extensão
 */
export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin')?.trim();
  const configuredOrigin = process.env.MR_EXTENSION_ORIGIN?.trim() || DEFAULT_MR_EXTENSION_ORIGIN;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowedOrigins = [
    configuredOrigin,
    ...(isDevelopment ? ['http://localhost:8080'] : []),
  ].filter((value): value is string => Boolean(value));

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Vary': 'Origin'
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}
