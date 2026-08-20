import { describe, it, expect, vi } from 'vitest';
import { validateLicense } from './ext-api.server';

vi.mock('@/integrations/supabase/client.server', () => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
    storage: {
      from: vi.fn(),
      upload: vi.fn(),
      createSignedUrl: vi.fn()
    }
  };

  // Funções que retornam a chain
  const returnsChain = () => chain;
  chain.from.mockImplementation(returnsChain);
  chain.select.mockImplementation(returnsChain);
  chain.eq.mockImplementation(returnsChain);
  chain.insert.mockImplementation(returnsChain);
  chain.update.mockImplementation(returnsChain);
  chain.maybeSingle.mockImplementation(returnsChain);
  chain.storage.from.mockImplementation(() => chain.storage);

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
      admin.insert.mockClear();

      // Mocks para o fluxo de validateLicense:
      // 1. Busca licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões (select count)
      // O eq final do count precisa retornar o objeto count
      admin.eq.mockImplementation((key: string, val: any) => {
        // Se for a chamada de count (license_id no final)
        if (key === 'license_id') {
           return Promise.resolve({ count: 0, error: null });
        }
        return admin;
      });

      // 4. Criação de sessão
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
