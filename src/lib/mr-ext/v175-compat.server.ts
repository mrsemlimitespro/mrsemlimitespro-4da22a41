import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { normalizeAuth, validateKeyFormat } from './ext-api.server';

export function json(data: unknown, status = 200, cors: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

/**
 * A v17.5 oferece reset voluntário de dispositivo. O MR mantém a ação limitada
 * à licença informada; nenhum dado de outras licenças é exposto ao cliente.
 */
export async function resetLicenseDevice(body: unknown) {
  const { licenseKey } = normalizeAuth(body);
  if (!licenseKey) return { status: 400, data: { ok: false, error: 'missing_fields' } };
  if (!validateKeyFormat(licenseKey)) return { status: 400, data: { ok: false, error: 'invalid_format' } };

  const { data: license, error: licenseError } = await supabaseAdmin
    .from('licencas')
    .select('id, status')
    .eq('license_key', licenseKey)
    .maybeSingle();

  if (licenseError || !license) return { status: 404, data: { ok: false, error: 'license_not_found' } };
  if (license.status === 'revoked') return { status: 403, data: { ok: false, error: 'license_revoked' } };

  const { error: deleteError } = await supabaseAdmin
    .from('ext_sessions')
    .delete()
    .eq('license_id', license.id);

  if (deleteError) return { status: 500, data: { ok: false, error: 'reset_failed' } };
  return { status: 200, data: { ok: true, success: true, status: 'ok' } };
}

/**
 * As coleções abaixo são opt-in e ainda não possuem registros administrados
 * no MR Central. O formato explícito preserva a interface sem inventar dados.
 */
export function emptyNotifications() {
  return [];
}

export function emptyVersions() {
  return [];
}

export function noResellerRole() {
  return [];
}

export function noLicenseUser() {
  return [];
}

export function emptySkills() {
  return { skills: [], has_skills: false };
}

/**
 * O botão opcional de otimização não pode modificar o prompt sem um provedor
 * configurado. Retornamos o texto original de forma transparente, sem modelo,
 * crédito ou chamada externa.
 */
export function preservePrompt(body: any) {
  const prompt = typeof body?.prompt === 'string'
    ? body.prompt
    : typeof body?.message === 'string'
      ? body.message
      : typeof body?.text === 'string'
        ? body.text
        : '';
  return { ok: true, optimized_prompt: prompt, prompt, unchanged: true };
}
