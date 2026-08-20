import { describe, it, expect, vi } from 'vitest';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest } from '@/lib/mr-ext/ext-api.server';

// Mock do supabaseAdmin para evitar chamadas reais durante o teste
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      createSignedUrl: vi.fn()
    }
  }
}));

describe('MR CENTRAL V17 - Integration Tests', () => {

  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve retornar erro se licença estiver revogada', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ 
        data: { status: 'revoked' }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_revoked');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      // Mock da busca de licença
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ data: mockLic, error: null });
      // Mock da busca de sessão existente (não encontra)
      (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({ data: null, error: null });
      // Mock do count de sessões
      (supabaseAdmin.select as any).mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValueOnce({ count: 0, error: null }) 
      });
      // Mock da criação de sessão
      (supabaseAdmin.single as any).mockResolvedValueOnce({ 
        data: { session_id: 'sess-1' }, 
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
      const insertSpy = vi.spyOn(supabaseAdmin, 'insert');
      
      await auditRequest('lic-1', '/api/test', 'POST', 200, { key: 'secret' });
      
      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
        payload_sanitized: { key: '[REDACTED]' }
      }));
    });
  });
});
