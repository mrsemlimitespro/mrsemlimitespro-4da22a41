import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateKeyFormat, normalizeAuth, sanitizeAudit } from './ext-api.server';

describe('Extensão API Helpers', () => {
  it('deve validar o formato da licença MR-XXXX-XXXX-XXXX', () => {
    expect(validateKeyFormat('MR-ABCD-1234-EFGH')).toBe(true);
    expect(validateKeyFormat('MR-ABCD-1234')).toBe(false);
    expect(validateKeyFormat('ABCD-1234-EFGH')).toBe(false);
    expect(validateKeyFormat('MR-abcd-1234-efgh')).toBe(false); // Case sensitive A-Z
  });

  it('deve normalizar aliases de chave e HWID', () => {
    const body1 = { key: 'KEY1', device_id: 'HWID1' };
    expect(normalizeAuth(body1)).toEqual({ licenseKey: 'KEY1', hwid: 'HWID1' });

    const body2 = { license_key: 'KEY2', hwid: 'HWID2' };
    expect(normalizeAuth(body2)).toEqual({ licenseKey: 'KEY2', hwid: 'HWID2' });

    const body3 = { user_license_key: 'KEY3', deviceId: 'HWID3' };
    expect(normalizeAuth(body3)).toEqual({ licenseKey: 'KEY3', hwid: 'HWID3' });
  });

  it('deve sanitizar campos sensíveis na auditoria', () => {
    const payload = {
      user: 'test',
      token: 'secret-token',
      nested: {
        apiKey: 'sensitive-api-key',
        safe: 'data'
      },
      array: [{ authorization: 'bearer x' }]
    };

    const sanitized = sanitizeAudit(payload);

    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.nested.apiKey).toBe('[REDACTED]');
    expect(sanitized.nested.safe).toBe('data');
    expect(sanitized.array[0].authorization).toBe('[REDACTED]');
  });
});
