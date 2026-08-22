import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const license = {
    id: 'child-lic-175', license_key: 'MR-1111-2222-3333', user_name: 'Cliente MR',
    email: null, status: 'active', expires_at: null, max_devices: 1,
  };
  const session = {
    id: 'child-session', license_id: license.id, hwid: 'hwid-175',
    session_id: 'child-session-175', last_seen: '2026-08-22T00:00:00.000Z',
  };
  return {
    supabaseAdmin: {
      from(table: string) {
        if (table === 'licencas') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: license, error: null }) }) }) };
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

const { Route } = await import('@/routes/api/public/ext/validate-child-license');
const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('validate-child-license handler', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('aceita o contrato secundário v17.5 e devolve uma sessão MR válida', async () => {
    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/validate-child-license', {
        method: 'POST',
        headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: 'MR-1111-2222-3333', hwid: 'hwid-175', user_agent: 'Chrome' }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      valid: true,
      status: 'valid',
      session_id: 'child-session-175',
      session_token: 'child-session-175',
    });
  });
});
