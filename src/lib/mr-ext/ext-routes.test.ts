import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const mockResult = { data: null, error: null, count: 0 };
  
  const createMockChain = () => {
    const chain: any = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(mockResult),
      single: vi.fn().mockResolvedValue(mockResult),
      then: (resolve: any) => Promise.resolve(mockResult).then(resolve)
    };
    return chain;
  };

  const supabaseAdmin = createMockChain();
  
  return { supabaseAdmin };
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
      
      // Reset generic mocks
      admin.maybeSingle.mockReset();
      admin.eq.mockReset();
      admin.single.mockReset();

      // Configure mock chain behavior
      admin.from.mockReturnThis();
      admin.select.mockReturnThis();
      
      // The implementation will call .eq() multiple times.
      // We need it to return 'admin' (this) to keep the chain alive,
      // EXCEPT when we want it to act as a promise for the 'count' operation.
      admin.eq.mockReturnValue(admin);

      // 1. Fetch license (maybeSingle)
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      
      // 2. Fetch existing session (maybeSingle)
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count sessions (This is called as an awaited promise)
      // .from().select('*', {count: 'exact'}).eq('license_id', lic.id)
      // We need the LAST call in the chain to be the promise.
      // However, our mocked .eq returns 'admin'. 
      // If the code awaits the result of .eq(), it awaits 'admin'.
      // We need admin to be thenable.
      admin.then = (resolve: any) => resolve({ count: 0, error: null });

      // 4. Create session (single)
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
