import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
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
  return { supabaseAdmin: new Proxy(chain, handlers) };
});

import { validateLicense } from './ext-api.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      const admin = supabaseAdmin as any;
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const admin = supabaseAdmin as any;
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      admin.maybeSingle.mockReset();
      admin.select.mockClear();
      admin.single.mockReset();
      admin.eq.mockClear();

      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      admin.eq.mockImplementationOnce(() => Promise.resolve({ count: 0, error: null }));
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
