import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {} }));

const { Route: NotificationsRoute } = await import('@/routes/api/public/ext/get-notifications');
const { Route: VersionsRoute } = await import('@/routes/api/public/ext/get-versions');
const { Route: SkillsRoute } = await import('@/routes/api/public/ext/get-skills');
const { Route: OptimizeRoute } = await import('@/routes/api/public/ext/optimize-prompt');

const extensionOrigin = 'chrome-extension://fixed-test-extension-id';
const previousOrigin = process.env.MR_EXTENSION_ORIGIN;
const previousNodeEnv = process.env.NODE_ENV;

describe('handlers compatíveis da extensão v17.5', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.MR_EXTENSION_ORIGIN = extensionOrigin;
  });

  afterEach(() => {
    process.env.MR_EXTENSION_ORIGIN = previousOrigin;
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('devolve coleções vazias explícitas para recursos ainda sem cadastro no MR', async () => {
    const notifications = NotificationsRoute.options.server?.handlers?.GET as (args: { request: Request }) => Promise<Response>;
    const versions = VersionsRoute.options.server?.handlers?.GET as (args: { request: Request }) => Promise<Response>;
    const skills = SkillsRoute.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;

    const request = (path: string, method = 'GET', body?: unknown) => new Request(`https://mr.example${path}`, {
      method,
      headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    await expect((await notifications({ request: request('/api/public/ext/get-notifications') })).json()).resolves.toEqual([]);
    await expect((await versions({ request: request('/api/public/ext/get-versions') })).json()).resolves.toEqual([]);
    await expect((await skills({ request: request('/api/public/ext/get-skills', 'POST', { licKey: 'MR-1111-2222-3333' }) })).json())
      .resolves.toEqual({ skills: [], has_skills: false });
  });

  it('preserva o prompt na rota de otimização sem convocar um provedor externo', async () => {
    const optimize = OptimizeRoute.options.server?.handlers?.POST as (args: { request: Request }) => Promise<Response>;
    const response = await optimize({
      request: new Request('https://mr.example/api/public/ext/optimize-prompt', {
        method: 'POST',
        headers: { Origin: extensionOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Organize a interface existente.' }),
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      optimized_prompt: 'Organize a interface existente.',
      unchanged: true,
    });
  });
});
