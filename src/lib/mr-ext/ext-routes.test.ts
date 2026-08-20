import { describe, it, expect, vi } from 'vitest';
import { validateLicense } from './ext-api.server';

// Mock do supabaseAdmin com encadeamento manual fluente
vi.mock('@/integrations/supabase/client.server', () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(), // GARANTE QUE RETORNA A CHAIN
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      createSignedUrl: vi.fn()
    }
  };
  return { supabaseAdmin: chain };
});

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const admin = supabaseAdmin as any;
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      admin.maybeSingle.mockReset();
      admin.select.mockClear();
      admin.single.mockReset();
      admin.eq.mockClear();

      // Configura os mocks para as chamadas consecutivas de maybeSingle
      admin.maybeSingle
        .mockResolvedValueOnce({ data: mockLic, error: null }) // 1. Busca licença
        .mockResolvedValueOnce({ data: null, error: null });   // 2. Busca sessão

      // Count de sessões
      admin.select.mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null })
      }));

      // Criação de sessão
      admin.insert.mockReturnThis();
      admin.select.mockReturnThis();
      admin.single.mockResolvedValueOnce({ 
        data: { id: 'sess-1', session_id: 'sess-uuid', last_seen: new Date().toISOString() }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(true);
      expect(result.license?.id).toBe('lic-1');
    });
  });
});
