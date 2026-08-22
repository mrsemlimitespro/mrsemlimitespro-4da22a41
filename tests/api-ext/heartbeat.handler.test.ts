import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const license = {
    id: 'lic-123', license_key: 'MR-1234-5678-9012', user_name: 'Cliente MR',
    email: null, status: 'active', expires_at: null, max_devices: 1,
  };
  const session = {
    id: 'session-row', license_id: license.id, hwid: 'hwid-1',
    session_id: 'session-456', last_seen: '2026-08-20T00:00:00.000Z',
  };

  return {
    supabaseAdmin: {
      from(table: string) {
        if (table === 'licencas') return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: license, error: null }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
        if (table === 'ext_sessions') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: session, error: null }) }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
        if (table === 'ext_requests') return { insert: async () => ({ error: null }) };
        throw new Error(`Tabela inesperada no teste: ${table}`);
      },
    },
  };
});

const { Route } = await import('@/routes/api/public/ext/heartbeat');
const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('heartbeat handler', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('mantém a sessão válida e devolve os aliases legados', async () => {
    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/heartbeat', {
        method: 'POST',
        headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: 'MR-1234-5678-9012', hwid: 'hwid-1' }),
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true, status: 'valid', license_status: 'active', type: 'active',
      customer_name: 'Cliente MR', session_token: 'session-456', session_id: 'session-456',
    });
  });
});
