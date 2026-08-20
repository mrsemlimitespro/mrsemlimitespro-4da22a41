import { describe, it, expect, vi } from 'vitest';

// Criamos o objeto mock ANTES do vi.mock, mas sem usar variáveis que o vitest não veja
// O segredo é que o vi.mock factory pode definir seu próprio comportamento
vi.mock('@/integrations/supabase/client.server', () => {
  const chain: any = {};
  
  const mockFunc = () => chain;
  
  chain.from = vi.fn().mockImplementation(mockFunc);
  chain.select = vi.fn().mockImplementation(mockFunc);
  chain.eq = vi.fn().mockImplementation(mockFunc);
  chain.insert = vi.fn().mockImplementation(mockFunc);
  chain.update = vi.fn().mockImplementation(mockFunc);
  chain.maybeSingle = vi.fn().mockImplementation(mockFunc);
  chain.single = vi.fn().mockImplementation(mockFunc);
  
  chain.storage = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn(),
    createSignedUrl: vi.fn()
  };

  return { supabaseAdmin: chain };
});

// Importação da lógica DEPOIS do mock
import { validateLicense } from './ext-api.server';

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
      
      // Re-setup das implementações que retornam a chain (pois o mockReset pode limpá-las se não for cuidadoso)
      const mockFunc = () => admin;
      admin.from.mockImplementation(mockFunc);
      admin.select.mockImplementation(mockFunc);
      admin.eq.mockImplementation(mockFunc);
      admin.maybeSingle.mockImplementation(mockFunc);
      admin.insert.mockImplementation(mockFunc);
      admin.single.mockImplementation(mockFunc);

      // 1. Busca licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões
      admin.eq.mockImplementationOnce((key: string) => {
        if (key === 'license_id') return Promise.resolve({ count: 0, error: null });
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
