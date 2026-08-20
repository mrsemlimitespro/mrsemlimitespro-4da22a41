import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateKeyFormat, sanitizeAudit } from './ext-api.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Mock supabaseAdmin
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
  },
}));

describe('MR Ext V17 Logic', () => {
  describe('validateKeyFormat', () => {
    it('should validate standard MR keys', () => {
      expect(validateKeyFormat('MR-1234-ABCD-5678')).toBe(true);
      expect(validateKeyFormat('AB-MR-1234-ABCD-5678')).toBe(true);
      expect(validateKeyFormat('MR-1234-ABCD-5678-90EF')).toBe(true);
    });

    it('should fail invalid keys', () => {
      expect(validateKeyFormat('invalid')).toBe(false);
      expect(validateKeyFormat('MR-123')).toBe(false);
      expect(validateKeyFormat('')).toBe(false);
    });
  });

  describe('sanitizeAudit', () => {
    it('should redact sensitive fields', () => {
      const payload = {
        license_key: 'SECRET-KEY',
        data: 'public',
        nested: {
          token: 'PRIVATE-TOKEN',
          user: 'john'
        }
      };
      const sanitized = sanitizeAudit(payload);
      expect(sanitized.license_key).toBe('[REDACTED]');
      expect(sanitized.nested.token).toBe('[REDACTED]');
      expect(sanitized.data).toBe('public');
      expect(sanitized.nested.user).toBe('john');
    });
  });
});
