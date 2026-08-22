import { beforeEach, describe, expect, it, vi } from 'vitest';

const { admin } = vi.hoisted(() => ({
  admin: {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: admin }));

import {
  emptyNotifications,
  emptySkills,
  emptyVersions,
  noLicenseUser,
  noResellerRole,
  preservePrompt,
  resetLicenseDevice,
} from './v175-compat.server';

describe('compatibilidade MR para Lovable Infinito v17.5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém coleções auxiliares vazias sem fabricar notificações, versões, usuários ou skills', () => {
    expect(emptyNotifications()).toEqual([]);
    expect(emptyVersions()).toEqual([]);
    expect(noResellerRole()).toEqual([]);
    expect(noLicenseUser()).toEqual([]);
    expect(emptySkills()).toEqual({ skills: [], has_skills: false });
  });

  it('preserva o texto original na otimização quando não há provedor configurado', () => {
    expect(preservePrompt({ prompt: 'Refatore este componente.' })).toEqual({
      ok: true,
      optimized_prompt: 'Refatore este componente.',
      prompt: 'Refatore este componente.',
      unchanged: true,
    });
  });

  it('rejeita reset sem uma chave MR válida antes de consultar o banco', async () => {
    await expect(resetLicenseDevice({ license_key: 'LICENCA-ANTIGA' })).resolves.toEqual({
      status: 400,
      data: { ok: false, error: 'invalid_format' },
    });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('remove apenas as sessões da licença cujo reset foi solicitado', async () => {
    const deleteChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    admin.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'lic-175', status: 'active' }, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({ delete: vi.fn().mockReturnValue(deleteChain) });

    await expect(resetLicenseDevice({ license_key: 'MR-1111-2222-3333' })).resolves.toEqual({
      status: 200,
      data: { ok: true, success: true, status: 'ok' },
    });
    expect(deleteChain.eq).toHaveBeenCalledWith('license_id', 'lic-175');
  });
});
