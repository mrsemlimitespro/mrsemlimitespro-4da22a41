import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client.server', () => {
  const mockResult = { data: null, error: null, count: 0 };
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(mockResult),
    single: vi.fn().mockResolvedValue(mockResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn().mockResolvedValue(mockResult),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: '' }, error: null })
    },
    // Mocking the promise behavior (thenable)
    then: (resolve: any) => Promise.resolve(mockResult).then(resolve)
  };
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
      
      admin.maybeSingle.mockReset();
      admin.eq.mockClear();
      admin.single.mockReset();

      // Implementação fluida simples
      admin.from.mockReturnThis();
      admin.select.mockReturnThis();
      admin.eq.mockReturnThis();

      // 1. Busca licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // 3. Count de sessões (o .eq retorna o próprio admin se não for o ponto final)
      // O validateLicense faz: await admin.from().select('*', {count: 'exact'}).eq('license_id', lic.id)
      // Precisamos que o ÚLTIMO .eq retorne o resultado se for usado como promise
      admin.eq.mockImplementation((key: string) => {
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
