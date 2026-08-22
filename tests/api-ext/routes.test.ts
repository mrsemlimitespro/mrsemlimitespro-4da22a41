import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {},
}));

const { buildExtensionLicenseResponse, DEFAULT_MR_EXTENSION_ORIGIN, getCorsHeaders } = await import('@/lib/mr-ext/ext-api.server');

const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('MR CENTRAL V17 integration contracts', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('autoriza somente a origem configurada em produção', () => {
    const allowed = getCorsHeaders(new Request('https://mr.example/api', {
      headers: { Origin: extensionOrigin },
    }));
    const rejected = getCorsHeaders(new Request('https://mr.example/api', {
      headers: { Origin: 'chrome-extension://other-extension' },
    }));

    expect(allowed['Access-Control-Allow-Origin']).toBe(extensionOrigin);
    expect(allowed['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
    expect(allowed['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization, apikey');
    expect(rejected['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('usa a origem estável da distribuição quando a variável não foi configurada', () => {
    delete process.env.MR_EXTENSION_ORIGIN;
    const headers = getCorsHeaders(new Request('https://mr.example/api', {
      headers: { Origin: DEFAULT_MR_EXTENSION_ORIGIN },
    }));

    expect(headers['Access-Control-Allow-Origin']).toBe(DEFAULT_MR_EXTENSION_ORIGIN);
  });

  it('mantém localhost somente no desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const headers = getCorsHeaders(new Request('http://localhost/api', {
      headers: { Origin: 'http://localhost:8080' },
    }));

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:8080');
  });

  it('produz aliases de sessão sem perder os campos atuais', () => {
    const payload = buildExtensionLicenseResponse(
      {
        id: 'lic-123',
        license_key: 'MR-1234-5678-9012',
        user_name: 'Cliente MR',
        email: null,
        status: 'active',
        expires_at: null,
        max_devices: 2,
      },
      {
        id: 'session-row',
        license_id: 'lic-123',
        hwid: 'hwid-1',
        session_id: 'session-456',
        last_seen: '2026-08-20T00:00:00.000Z',
      },
      'hwid-1'
    );

    expect(payload).toMatchObject({
      ok: true,
      valid: true,
      status: 'valid',
      license_status: 'active',
      type: 'active',
      user_name: 'Cliente MR',
      customer_name: 'Cliente MR',
      session_id: 'session-456',
      session_token: 'session-456',
    });
  });

  it('preserva lastPayload como prioridade do proxy', () => {
    const body = {
      license_key: 'MR-1234-5678-9012',
      lastPayload: { messages: [{ role: 'user', content: 'teste' }] },
    };
    const motorPayload = body.lastPayload ?? body;

    expect(motorPayload).toEqual({ messages: [{ role: 'user', content: 'teste' }] });
  });
});
