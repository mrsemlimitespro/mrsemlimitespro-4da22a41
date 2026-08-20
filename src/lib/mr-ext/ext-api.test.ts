import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateKeyFormat, normalizeAuth, sanitizeAudit } from './ext-api.server';

// Mock do supabaseAdmin
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

describe('MR CENTRAL V17 - Auditoria e Lógica de Extensão', () => {
  
  describe('Validação de Formato', () => {
    it('deve aceitar MR-XXXX-XXXX-XXXX', () => {
      expect(validateKeyFormat('MR-ABCD-1234-EFGH')).toBe(true);
      expect(validateKeyFormat('MR-0000-AAAA-1111')).toBe(true);
    });

    it('deve aceitar formato longo SIGLA-MR-XXXX-XXXX-XXXX-XXXX', () => {
      expect(validateKeyFormat('UX-MR-ABCD-1234-EFGH-5678')).toBe(true);
      expect(validateKeyFormat('BR-MR-0000-AAAA-1111-CCCC')).toBe(true);
    });

    it('deve rejeitar formatos inválidos', () => {
      expect(validateKeyFormat('MR-ABCD-1234')).toBe(false);
      expect(validateKeyFormat('ABCD-1234-EFGH')).toBe(false);
      expect(validateKeyFormat('MR-abcd-1234-efgh')).toBe(false);
      expect(validateKeyFormat(null)).toBe(false);
    });
  });

  describe('Normalização de Entrada (Aliases)', () => {
    it('deve extrair chave e hwid de múltiplos campos', () => {
      expect(normalizeAuth({ key: 'K1', device_id: 'H1' })).toEqual({ licenseKey: 'K1', hwid: 'H1' });
      expect(normalizeAuth({ license_key: 'K2', hwid: 'H2' })).toEqual({ licenseKey: 'K2', hwid: 'H2' });
      expect(normalizeAuth({ chave: 'K3', deviceId: 'H3' })).toEqual({ licenseKey: 'K3', hwid: 'H3' });
    });
  });

  describe('Segurança e Sanitização', () => {
    it('deve remover tokens e chaves de logs de auditoria', () => {
      const sensitive = {
        user: 'joao',
        token: 'bearertoken123',
        authorization: 'Bearer xyz',
        apiKey: 'secret123',
        license_key: 'MR-1234-1234-1234',
        safe_data: 'ok'
      };
      const sanitized = sanitizeAudit(sensitive);
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.license_key).toBe('[REDACTED]');
      expect(sanitized.safe_data).toBe('ok');
    });
  });
});
