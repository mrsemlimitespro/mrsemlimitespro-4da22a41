import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  // O segredo é criar a chain dentro do factory para evitar hoisting errors
  const createMockChain = () => {
    const chain: any = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const handlers = {
      get: (target: any, prop: string) => {
        if (['then', 'catch', 'finally'].includes(prop)) return target[prop].bind(target);
        if (['from', 'select', 'eq', 'insert', 'update', 'maybeSingle', 'single', 'storage'].includes(prop)) {
          if (!target[prop]) {
            target[prop] = vi.fn().mockReturnValue(new Proxy(vi.fn().mockReturnValue(chain), handlers));
          }
          if (prop === 'storage') return new Proxy({}, handlers);
          return target[prop];
        }
        return target[prop];
      }
    };
    return new Proxy(chain, handlers);
  };
  return { supabaseAdmin: createMockChain() };
});

import { validateLicense } from './ext-api.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

describe('MR CENTRAL V17 - Integration Tests', () => {
  const adminMock = supabaseAdmin as any;

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

      adminMock.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      adminMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      adminMock.eq.mockImplementationOnce(() => Promise.resolve({ count: 0, error: null }));
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
