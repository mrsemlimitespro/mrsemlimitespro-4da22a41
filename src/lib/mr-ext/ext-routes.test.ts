import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const mockResult = { data: null, error: null, count: 0 };
  
  const createChain = () => {
    const chain: any = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(mockResult),
      single: vi.fn().mockResolvedValue(mockResult),
      // Mocking the promise behavior (thenable)
      then: (resolve: any) => Promise.resolve(mockResult).then(resolve)
    };
    return chain;
  };

  const supabaseAdmin = createChain();
  
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
      
      admin.maybeSingle.mockReset();
      admin.eq.mockClear();
      admin.single.mockReset();

      // Mocking the specific sequence of calls in validateLicense
      // 1. Fetch license
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Fetch existing session
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count sessions
      // .select('*', { count: 'exact', head: true }).eq(...)
      admin.eq.mockImplementationOnce(() => Promise.resolve({ count: 0, error: null }));

      // 4. Create session
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
