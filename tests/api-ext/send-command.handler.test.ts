import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { auditInsert } = vi.hoisted(() => ({
  auditInsert: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/integrations/supabase/client.server', () => {
  const license = {
    id: 'lic-123', license_key: 'MR-1234-5678-9012', user_name: 'Cliente MR',
    email: null, status: 'active', expires_at: null, max_devices: 1,
  };
  const session = { id: 'session-row', license_id: license.id, hwid: 'hwid-1', session_id: 'session-456', last_seen: '2026-08-20T00:00:00.000Z' };
  return {
    supabaseAdmin: {
      from(table: string) {
        if (table === 'licencas') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: license, error: null }) }) }) };
        if (table === 'ext_sessions') return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: session, error: null }) }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
        if (table === 'ext_requests') return {
          insert: auditInsert,
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ count: 7, error: null }),
                }),
              }),
            }),
          }),
        };
        throw new Error(`Tabela inesperada no teste: ${table}`);
      },
    },
  };
});

const { Route } = await import('@/routes/api/public/ext/send-command');
const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('send-command handler', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
    auditInsert.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('encaminha apenas lastPayload e realiza uma única chamada upstream', async () => {
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ upstream: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstreamFetch);

    const lastPayload = { messages: [{ role: 'user', content: 'teste' }], attachments: [{ url: 'https://file.example/a' }] };
    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/send-command', {
        method: 'POST',
        headers: { Origin: extensionOrigin, Authorization: 'Bearer legacy-proxy-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: 'MR-1234-5678-9012', hwid: 'hwid-1', projectId: 'project-123',
          token_lovable: 'fresh-lovable-token', payload: { ignored: true }, lastPayload,
        }),
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ upstream: true });
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch).toHaveBeenCalledWith(
      'https://api.lovable.dev/projects/project-123/chat',
      expect.objectContaining({
        body: JSON.stringify(lastPayload),
        headers: expect.objectContaining({ Authorization: 'Bearer fresh-lovable-token' }),
      })
    );
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      route: '/api/ext/command-completed', status_code: 200,
    }));
  });

  it('produz o contrato de anexo nativo quando o fallback v17.5 solicita upload', async () => {
    const upstreamFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: 'https://storage.example/upload',
        file_id: 'projects/project-123/files/file-175',
        headers: { 'x-goog-meta-source': 'extension' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://storage.example/download' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', upstreamFetch);

    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/send-command', {
        method: 'POST',
        headers: { Origin: extensionOrigin, Authorization: 'Bearer legacy-proxy-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          license_key: 'MR-1234-5678-9012',
          hwid: 'hwid-1',
          projeto_id: 'project-123',
          token_lovable: 'fresh-lovable-token',
          file_name: 'anexo.txt',
          content_type: 'text/plain',
          file_data: btoa('arquivo de teste'),
        }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      file_id: 'projects/project-123/files/file-175',
      file_name: 'anexo.txt',
      download_url: 'https://storage.example/download',
      mime_type: 'text/plain',
    });
    expect(upstreamFetch).toHaveBeenCalledTimes(3);
    expect(upstreamFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.lovable.dev/projects/project-123/files/generate-upload-url',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer fresh-lovable-token' }) })
    );
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      route: '/api/ext/upload-proxy', status_code: 200,
    }));
    expect(auditInsert).not.toHaveBeenCalledWith(expect.objectContaining({ route: '/api/ext/command-completed' }));
  });

  it('retorna a contagem real de comandos para o painel v17.5 sem exigir token Lovable ou projeto', async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal('fetch', upstreamFetch);

    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/send-command', {
        method: 'POST',
        headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_stats',
          user_license_key: 'MR-1234-5678-9012',
          device_id: 'hwid-1',
        }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, cmd_count: 7 });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('não contabiliza o comando quando o upstream devolve falha', async () => {
    const upstreamFetch = vi.fn(async () => new Response(JSON.stringify({ error: 'upstream_rejected' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', upstreamFetch);

    const handler = Route.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await handler({
      request: new Request('https://mr.example/api/public/ext/send-command', {
        method: 'POST',
        headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: 'MR-1234-5678-9012', hwid: 'hwid-1', projectId: 'project-123',
          token_lovable: 'fresh-lovable-token', lastPayload: { message: 'teste' },
        }),
      }),
    });

    expect(response.status).toBe(500);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      route: '/api/ext/command-failed', status_code: 500,
    }));
    expect(auditInsert).not.toHaveBeenCalledWith(expect.objectContaining({ route: '/api/ext/command-completed' }));
  });
});
