import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeAudit, validateKeyFormat, normalizeAuth } from './ext-api.server';

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

describe('MR CENTRAL V17 - Helpers & Logic', () => {
  describe('validateKeyFormat', () => {
    it('deve aceitar formatos validos', () => {
      expect(validateKeyFormat('MR-1234-5678-9012')).toBe(true);
      expect(validateKeyFormat('PR-MR-1234-5678-9012')).toBe(true);
      expect(validateKeyFormat('V1-MR-ABCD-EFGH-IJKL-MNOP')).toBe(true);
    });

    it('deve recusar formatos invalidos', () => {
      expect(validateKeyFormat('INVALID-KEY')).toBe(false);
      expect(validateKeyFormat('MR-123')).toBe(false);
      expect(validateKeyFormat(null)).toBe(false);
    });
  });

  describe('normalizeAuth', () => {
    it('deve extrair campos de diversos aliases', () => {
      expect(normalizeAuth({ license_key: 'KEY1', hwid: 'HW1' })).toEqual({ licenseKey: 'KEY1', hwid: 'HW1' });
      expect(normalizeAuth({ key: 'KEY2', device_id: 'HW2' })).toEqual({ licenseKey: 'KEY2', hwid: 'HW2' });
      expect(normalizeAuth({ chave: 'KEY3', deviceId: 'HW3' })).toEqual({ licenseKey: 'KEY3', hwid: 'HW3' });
    });
  });

  describe('sanitizeAudit', () => {
    it('deve mascarar campos sensiveis', () => {
      const payload = {
        license_key: 'SECRET',
        token: 'ABC',
        nested: { key: '123' },
        safe: 'data'
      };
      const sanitized = sanitizeAudit(payload);
      expect(sanitized.license_key).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.nested.key).toBe('[REDACTED]');
      expect(sanitized.safe).toBe('data');
    });
  });
});
