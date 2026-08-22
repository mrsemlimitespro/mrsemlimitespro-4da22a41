import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const license = {
    id: 'lic-123', license_key: 'MR-1234-5678-9012', user_name: 'Cliente MR',
    email: null, status: 'active', expires_at: null, max_devices: 1,
  };
  const session = { id: 'session-row', license_id: license.id, hwid: 'hwid-1', session_id: 'session-456', last_seen: '2026-08-20T00:00:00.000Z' };
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

const { Route } = await import('@/routes/api/public/ext/fix-stream');
const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('fix-stream handler', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('repassa falha upstream sem fabricar sucesso', async () => {
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstreamFetch);

    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/fix-stream', {
        method: 'POST',
        headers: { Origin: extensionOrigin, Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: 'MR-1234-5678-9012', hwid: 'hwid-1', projectId: 'project-123',
          lastPayload: { messages: [{ role: 'user', content: 'teste' }] },
        }),
      }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });
});
