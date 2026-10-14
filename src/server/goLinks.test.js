import { describe, expect, it } from 'vitest';
import { aggregateClicks, buildTargetUrl, clickPathname, parseClickPathname, parseSlug, parseTarget, targetForSlug } from '../../api/lib/goLinks.js';
import { buildIdSuggestions } from '../components/BlurLookup.jsx';

describe('go links', () => {
  it('only allows listed targets and safe slugs', () => {
    expect(parseTarget('mint')).toBe('mint');
    expect(parseTarget('https://evil.example')).toBeNull();
    expect(parseTarget('__proto__')).toBeNull();
    expect(parseSlug('Launch-1')).toBe('launch-1');
    expect(parseSlug('../x')).toBeNull();
  });
  it('maps each slug to one fixed target (no ?to= override)', () => {
    expect(targetForSlug('see-your-afa')).toBe('mint');
    expect(targetForSlug('editor-share')).toBe('editor');
    expect(targetForSlug('progress')).toBe('progress');
    expect(buildTargetUrl(targetForSlug('x-post'), 'x-post')).toMatch(/^https:\/\/www\.apefacingapes\.com\//);
  });
  it('never points at the claim page and adds UTM', () => {
    const url = buildTargetUrl('mint', 'oct-drop');
    expect(url).toBe('https://www.apefacingapes.com/?utm_source=x&utm_medium=social&utm_campaign=oct-drop');
    expect(url).not.toContain('claim');
  });
  it('tags internal slugs as referral', () => {
    expect(buildTargetUrl('mint', 'ape-page')).toBe('https://www.apefacingapes.com/?utm_source=afa-progress&utm_medium=referral&utm_campaign=ape-page');
    expect(buildTargetUrl('editor', 'see-your-afa')).toContain('utm_source=afa-progress&utm_medium=referral');
  });
  it('round-trips click pathnames and aggregates', () => {
    const p = clickPathname('oct-drop', 'editor', Date.UTC(2026, 9, 14), 0.5);
    expect(parseClickPathname(p)).toMatchObject({ slug: 'oct-drop', target: 'editor' });
    const agg = aggregateClicks([parseClickPathname(p), parseClickPathname(p)]);
    expect(agg.bySlug['oct-drop'].byTarget.editor).toBe(2);
  });
});

describe('id suggestions', () => {
  it('lists minted ids first', () => {
    const s = buildIdSuggestions('12', new Set([1200, 125, 12]));
    expect(s.slice(0, 3).map((x) => x.minted)).toEqual([true, true, true]);
    expect(s.slice(0, 3).map((x) => x.id)).toEqual([12, 125, 1200]);
    expect(s[3].minted).toBe(false);
  });
});
