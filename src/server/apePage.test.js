import { describe, expect, it } from 'vitest';
import { renderApePage } from '../../api/ape-page.js';
import { apeCopy, parseApeId } from '../../api/lib/apeState.js';

describe('ape page', () => {
  it('renders OG + twitter card tags', () => {
    const html = renderApePage({ id: 5000, minted: false });
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('https://afa-mint-progress.vercel.app/api/og-ape?id=5000');
    expect(html).toContain('still looking the other way');
    expect(html).not.toContain('/images/5000.webp');
  });
  it('copy and id parsing', () => {
    expect(apeCopy(1, true).title).toBe('Ape #1 is facing you.');
    expect(parseApeId('10000')).toBeNull();
    expect(parseApeId('42')).toBe(42);
  });
});
