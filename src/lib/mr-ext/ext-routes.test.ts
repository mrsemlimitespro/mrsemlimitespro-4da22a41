import { describe, it, expect, vi } from 'vitest';

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

  const returnsChain = () => chain;
  chain.from.mockImplementation(returnsChain);
  chain.select.mockImplementation(returnsChain);
  chain.eq.mockImplementation(returnsChain);
  chain.insert.mockImplementation(returnsChain);
  chain.update.mockImplementation(returnsChain);
  chain.maybeSingle.mockImplementation(returnsChain);
  chain.single.mockImplementation(returnsChain);
  chain.storage.from.mockImplementation(() => chain.storage);

  // Garantir que a chain em si é um "thenable" para não quebrar se for aguardada
  chain.then = (onFullfilled: any) => Promise.resolve({ data: null, error: null }).then(onFullfilled);

  return { supabaseAdmin: chain };
});

import { validateLicense } from './ext-api.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

describe('MR CENTRAL V17 - Integration Tests', () => {
  const admin = supabaseAdmin as any;

  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      // Reiniciar mocks para estado limpo
      admin.maybeSingle.mockReset();
      admin.select.mockClear();
      admin.single.mockReset();
      admin.eq.mockClear();
      
      // Re-setup implementations que retornam a chain
      const returnsChain = () => admin;
      admin.from.mockImplementation(returnsChain);
      admin.select.mockImplementation(returnsChain);
      admin.eq.mockImplementation(returnsChain);
      admin.maybeSingle.mockImplementation(returnsChain);
      admin.single.mockImplementation(returnsChain);

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
