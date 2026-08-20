import { describe, it, expect, vi } from 'vitest';
import { validateLicense } from './ext-api.server';

// Mock robusto para garantir que .eq() retorne algo que tenha .maybeSingle()
vi.mock('@/integrations/supabase/client.server', () => {
  const chain: any = {};
  
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.storage = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn(),
    createSignedUrl: vi.fn()
  };

  // Precisamos que a chain se comporte como uma Promise quando for o final do encadeamento
  chain.then = (onFullfilled: any) => Promise.resolve().then(onFullfilled);

  return { supabaseAdmin: chain };
});

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const admin = supabaseAdmin as any;
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

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

      // Configuração para validateLicense:
      // 1. Busca licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões
      // Aqui o .eq() deve retornar o resultado do count
      admin.eq.mockImplementation((key: string, val: any) => {
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
