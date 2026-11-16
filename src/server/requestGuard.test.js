import { describe, expect, it } from 'vitest';
import { slugAllowsClickLog } from '../../api/lib/goLinks.js';
import { clientIp, hasTrustedProvenance, rateLimitAllows } from '../../api/lib/requestGuard.js';

describe('request guard', () => {
  it('requires trusted origin or referer', () => {
    expect(hasTrustedProvenance({ headers: { origin: 'https://afa-mint-progress.vercel.app' } })).toBe(true);
    expect(hasTrustedProvenance({ headers: { origin: 'https://evil.example' } })).toBe(false);
    expect(hasTrustedProvenance({ headers: { referer: 'https://afa-editor.app/foo' } })).toBe(true);
    expect(hasTrustedProvenance({ headers: {} })).toBe(false);
  });

  it('reads client ip from forwarded header', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '203.0.113.9, 1.1.1.1' } })).toBe('203.0.113.9');
  });

  it('rate-limits per ip', () => {
    expect(rateLimitAllows('203.0.113.50-test')).toBe(true);
  });

  it('allows click logs only for safe slugs', () => {
    expect(slugAllowsClickLog('launch-1')).toBe(true);
    expect(slugAllowsClickLog('../x')).toBe(false);
    expect(slugAllowsClickLog(null)).toBe(false);
  });
});