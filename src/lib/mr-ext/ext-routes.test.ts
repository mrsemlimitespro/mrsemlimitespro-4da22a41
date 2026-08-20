import { describe, it, expect, vi } from 'vitest';
import { normalizeAuth, validateKeyFormat, validateLicense, auditRequest } from './ext-api.server';

// Mock do supabaseAdmin com encadeamento manual robusto para Vitest
vi.mock('@/integrations/supabase/client.server', () => {
  const mockMethods = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };
  
  // Garantir que todos os métodos encadeáveis retornem o próprio mock
  mockMethods.from.mockReturnValue(mockMethods);
  mockMethods.select.mockReturnValue(mockMethods);
  mockMethods.eq.mockReturnValue(mockMethods);
  mockMethods.insert.mockReturnValue(mockMethods);
  mockMethods.update.mockReturnValue(mockMethods);
  
  return { supabaseAdmin: mockMethods };
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
      
      // 1. Mock da busca de licença
      admin.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Mock da busca de sessão existente (não encontra)
      admin.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // 3. Mock do count de sessões
      admin.select.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValueOnce({ count: 0, error: null }) 
      });
      // 4. Mock da criação de sessão
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
      const insertSpy = vi.spyOn(admin, 'insert');
      
      await auditRequest('lic-1', '/api/test', 'POST', 200, { key: 'secret' });
      
      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
        payload_sanitized: { key: '[REDACTED]' }
      }));
    });
  });
});
