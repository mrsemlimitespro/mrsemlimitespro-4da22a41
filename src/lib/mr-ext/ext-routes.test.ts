import { describe, it, expect, vi } from 'vitest';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest } from './ext-api.server';

// Mock do supabaseAdmin com encadeamento robusto
vi.mock('@/integrations/supabase/client.server', () => {
  const createMockChain = () => {
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
    
    // Configura o encadeamento
    chain.from.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.insert.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.storage.from.mockReturnValue(chain.storage);
    
    return { supabaseAdmin: chain };
  };
  
  return createMockChain();
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

    it('deve retornar erro se licença estiver revogada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const admin = supabaseAdmin as any;
      admin.maybeSingle.mockResolvedValueOnce({ 
        data: { status: 'revoked' }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_revoked');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const admin = supabaseAdmin as any;
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      admin.maybeSingle.mockReset();
      admin.select.mockClear();
      admin.single.mockReset();
      admin.eq.mockClear();

      // 1. Busca de licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca de sessão existente
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // 3. Count de sessões
      admin.eq.mockReturnValueOnce({ 
        mockResolvedValueOnce: vi.fn().mockResolvedValue({ count: 0, error: null })
      });
      // Fallback para count head: true
      admin.select.mockReturnValueOnce(admin);
      admin.eq.mockResolvedValueOnce({ count: 0, error: null });

      // 4. Criação de sessão
      admin.insert.mockReturnValueOnce(admin);
      admin.select.mockReturnValueOnce(admin);
      admin.single.mockResolvedValueOnce({ 
        data: { id: 'sess-1', session_id: 'sess-uuid', last_seen: new Date().toISOString() }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(true);
      expect(result.license?.id).toBe('lic-1');
    });
  });

  describe('auditRequest', () => {
    it('deve chamar insert com dados sanitizados', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const admin = supabaseAdmin as any;
      admin.insert.mockClear();
      
      await auditRequest('lic-1', '/api/test', 'POST', 200, { key: 'secret' });
      
      expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({
        payload_sanitized: { key: '[REDACTED]' }
      }));
    });
  });
});
