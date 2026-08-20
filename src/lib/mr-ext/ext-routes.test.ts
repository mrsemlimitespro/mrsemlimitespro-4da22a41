import { describe, it, expect, vi } from 'vitest';
import * as extLogic from './ext-api.server';

// O segredo é mocar o supabaseAdmin DEPOIS das importações ou usar um proxy real
vi.mock('@/integrations/supabase/client.server', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      createSignedUrl: vi.fn()
    }
  };
  return { supabaseAdmin: mock };
});

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ data: null, error: null });

      const result = await extLogic.validateLicense('MR-1111-2222-3333', 'hwid-1');
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

      // 1. Busca de licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca de sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões
      // Mock do select('*', {count: 'exact'})
      admin.select.mockImplementationOnce(() => ({
        eq: vi.fn().mockResolvedValue({ count: 0, error: null })
      }));

      // 4. Criação de sessão
      admin.insert.mockReturnThis();
      admin.select.mockReturnThis();
      admin.single.mockResolvedValueOnce({ 
        data: { id: 'sess-1', session_id: 'sess-uuid', last_seen: new Date().toISOString() }, 
        error: null 
      });

      const result = await extLogic.validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(true);
      expect(result.license?.id).toBe('lic-1');
    });
  });
});
