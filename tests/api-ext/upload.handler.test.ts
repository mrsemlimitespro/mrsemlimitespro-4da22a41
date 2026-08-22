import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const license = {
    id: 'lic-123', license_key: 'MR-1234-5678-9012', user_name: 'Cliente MR',
    email: null, status: 'active', expires_at: null, max_devices: 1,
  };
  const session = { id: 'session-row', license_id: license.id, hwid: 'hwid-1', session_id: 'session-456', last_seen: '2026-08-20T00:00:00.000Z' };
  const storage = {
    from: () => ({
      upload: async () => ({ error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.example/upload' }, error: null }),
    }),
  };
  return {
    supabaseAdmin: {
      storage,
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
        if (table === 'ext_uploads') return {
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'upload-row' }, error: null }) }) }),
        };
        throw new Error(`Tabela inesperada no teste: ${table}`);
      },
    },
  };
});

const { Route } = await import('@/routes/api/public/ext/upload');
const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('upload handler', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('aceita upload permitido e devolve URL assinada', async () => {
    const formData = new FormData();
    formData.append('license_key', 'MR-1234-5678-9012');
    formData.append('hwid', 'hwid-1');
    formData.append('file', new Blob(['conteudo'], { type: 'text/plain' }), 'nota.txt');

    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/upload', {
        method: 'POST',
        headers: { Origin: extensionOrigin },
        body: formData,
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, url: 'https://signed.example/upload', licenca_id: 'lic-123' });
  });
});
