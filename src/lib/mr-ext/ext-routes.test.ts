import { describe, it, expect, vi } from 'vitest';
import { validateLicense, auditRequest } from './ext-api.server';

// Mock robusto do supabaseAdmin
const mockChain: any = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn(),
    createSignedUrl: vi.fn()
  }
};

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: mockChain
}));

describe('MR CENTRAL V17 - Integration Tests', () => {
  describe('validateLicense', () => {
    it('deve retornar erro se licença não for encontrada', async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_not_found');
    });

    it('deve retornar erro se licença estiver revogada', async () => {
      mockChain.maybeSingle.mockResolvedValueOnce({ 
        data: { status: 'revoked' }, 
        error: null 
      });

      const result = await validateLicense('MR-1111-2222-3333', 'hwid-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('license_revoked');
    });

    it('deve validar com sucesso licença ativa', async () => {
      const mockLic = { id: 'lic-1', status: 'active', license_key: 'MR-1111-2222-3333', max_devices: 1 };
      
      mockChain.maybeSingle.mockReset();
      mockChain.select.mockClear();
      mockChain.single.mockReset();
      mockChain.eq.mockClear();

      // Encadeamento para o count de sessões
      mockChain.eq.mockImplementation((key: string, val: any) => {
        if (key === 'license_id') {
           return {
             ...mockChain,
             then: (cb: any) => Promise.resolve(cb({ count: 0, error: null }))
           };
        }
        return mockChain;
      });

      // 1. Busca de licença
      mockChain.maybeSingle.mockResolvedValueOnce({ data: mockLic, error: null });
      // 2. Busca de sessão existente
      mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // Ajuste para o count específico
      mockChain.select.mockImplementation((sel: string, opts: any) => {
        if (opts && opts.count === 'exact') {
           return {
             eq: vi.fn().mockResolvedValue({ count: 0, error: null })
           };
        }
        return mockChain;
      });

      // 4. Criação de sessão
      mockChain.single.mockResolvedValueOnce({ 
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
      mockChain.insert.mockClear();
      
      await auditRequest('lic-1', '/api/test', 'POST', 200, { key: 'secret' });
      
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        payload_sanitized: { key: '[REDACTED]' }
      }));
    });
  });
});
