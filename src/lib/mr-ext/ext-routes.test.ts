import { describe, it, expect, vi } from 'vitest';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest } from './ext-api.server';

// Mock do supabaseAdmin com encadeamento manual para Vitest
vi.mock('@/integrations/supabase/client.server', () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
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
      
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      admin.select.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValueOnce({ count: 0, error: null }) 
      });
      admin.single.mockResolvedValueOnce({ 
        data: { session_id: 'sess-1', last_seen: new Date().toISOString() }, 
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
      
      await auditRequest('lic-1', '/api/test', 'POST', 200, { key: 'secret' });
      
      expect(admin.insert).toHaveBeenCalledWith(expect.objectContaining({
        payload_sanitized: { key: '[REDACTED]' }
      }));
    });
  });
});
