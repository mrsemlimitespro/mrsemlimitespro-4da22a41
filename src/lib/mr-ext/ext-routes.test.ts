import { describe, it, expect, vi } from 'vitest';
import { validateLicense } from './ext-api.server';

// O Vitest eleva o vi.mock, então não podemos usar variáveis de escopo externo nele diretamente
// Mas podemos usar objetos retornados pela factory
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

  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.storage.from.mockReturnValue(chain.storage);

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

      // Configuração para validateLicense:
      // 1. Busca licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões
      // Precisamos que depois de eq() no count retorne a promisse
      admin.eq.mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));

      // 4. Criação de sessão
      admin.insert.mockReturnValue(admin);
      admin.select.mockReturnValue(admin);
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
