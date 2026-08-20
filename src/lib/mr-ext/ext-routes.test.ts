import { describe, it, expect, vi } from 'vitest';

// Criar o mock com um Proxy para capturar qualquer chamada encadeada
const createMockChain = () => {
  const chain: any = vi.fn(() => Promise.resolve({ data: null, error: null }));
  
  // Handlers para o Proxy
  const handlers = {
    get: (target: any, prop: string) => {
      // Se for then, se comporta como Promise
      if (prop === 'then') return target.then.bind(target);
      if (prop === 'catch') return target.catch.bind(target);
      if (prop === 'finally') return target.finally.bind(target);
      
      // Funções de mock específicas
      if (['from', 'select', 'eq', 'insert', 'update', 'maybeSingle', 'single', 'storage'].includes(prop)) {
        if (!target[prop]) {
          target[prop] = vi.fn().mockReturnValue(new Proxy(vi.fn().mockReturnValue(chain), handlers));
        }
        // Para storage, retorna o próprio proxy
        if (prop === 'storage') return new Proxy({}, handlers);
        
        return target[prop];
      }
      
      return target[prop];
    }
  };

  return new Proxy(chain, handlers);
};

const adminMock = createMockChain();

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: adminMock
}));

import { validateLicense } from './ext-api.server';

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      adminMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      adminMock.maybeSingle.mockReset();
      adminMock.select.mockClear();
      adminMock.single.mockReset();
      adminMock.eq.mockClear();

      // Setup sequencial para validateLicense
      // 1. Busca licença
      adminMock.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      adminMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões
      // No código: .select('*', {count: 'exact'}).eq('license_id', lic.id)
      adminMock.eq.mockImplementationOnce(() => Promise.resolve({ count: 0, error: null }));

      // 4. Criação de sessão
      adminMock.single.mockResolvedValueOnce({ 
        data: { id: 'sess-1', session_id: 'sess-uuid', last_seen: new Date().toISOString() }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(true);
      expect(result.license?.id).toBe('lic-1');
    });
  });
});
