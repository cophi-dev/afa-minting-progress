import { describe, expect, it } from 'vitest';
import { aggregateEvents, eventPathname, parseEvent, parseEventPathname } from '../../api/lib/events.js';

describe('click events', () => {
  it('accepts only allow-listed site/event/label', () => {
    expect(parseEvent({ site: 'editor', event: 'mint_cta_click', label: '1234' })).toEqual({ site: 'editor', event: 'mint_cta_click', label: '1234', source: 'direct' });
    expect(parseEvent({ site: 'progress', event: 'mint_cta_click' })).toMatchObject({ label: 'none' });
    expect(parseEvent({ site: 'editor', event: 'share', label: 'x' })).not.toBeNull();
    expect(parseEvent({ site: 'editor', event: 'download', label: 'wide' })).not.toBeNull();
    expect(parseEvent({ site: 'editor', event: 'share', label: 'mail' })).toBeNull();
    expect(parseEvent({ site: 'editor', event: 'open_editor' })).toBeNull();
    expect(parseEvent({ site: 'evil', event: 'share', label: 'x' })).toBeNull();
    expect(parseEvent({ site: 'editor', event: '__proto__', label: 'x' })).toBeNull();
    expect(parseEvent({ site: 'editor', event: 'mint_cta_click', label: '10000' })).toBeNull();
    expect(parseEvent({ site: 'editor', event: 'mint_cta_click', label: '../x' })).toBeNull();
  });
  it('round-trips pathnames and aggregates with time range', () => {
    const a = eventPathname({ site: 'editor', event: 'apefest_toggle', label: 'on' }, Date.UTC(2026, 9, 15), 0.5);
    const b = eventPathname({ site: 'progress', event: 'open_editor', label: '970' }, Date.UTC(2026, 9, 16), 0.1);
    const agg = aggregateEvents([parseEventPathname(a), parseEventPathname(b), parseEventPathname(a), null]);
    expect(agg.total).toBe(3);
    expect(agg.bySite.editor.apefest_toggle.byLabel.on).toBe(2);
    expect(agg.bySite.progress.open_editor.byDay['2026-10-16']).toBe(1);
    expect(agg.range.from).toBe('2026-10-15T00:00:00.000Z');
  });
});

import { parseSource } from '../../api/lib/events.js';
import { computeSource } from '../utils/source.js';

describe('event source', () => {
  it('derives source from landing utm, else referrer domain, else direct', () => {
    expect(computeSource('https://afa-mint-progress.vercel.app/?utm_source=x&utm_campaign=oct-drop', 'https://t.co/abc', 'afa-mint-progress.vercel.app')).toBe('x~oct-drop');
    expect(computeSource('https://afa-editor.app/?utm_source=afa-progress', '', 'afa-editor.app')).toBe('afa-progress');
    expect(computeSource('https://afa-editor.app/', 'https://www.x.com/home', 'afa-editor.app')).toBe('x.com');
    expect(computeSource('https://afa-editor.app/', 'https://afa-editor.app/x', 'afa-editor.app')).toBe('direct');
    expect(computeSource('https://afa-editor.app/', '', 'afa-editor.app')).toBe('direct');
    expect(computeSource('https://afa-editor.app/?utm_source=<script>X&utm_campaign=' + 'a'.repeat(80), '', 'afa-editor.app')).toBe(`scriptx~${'a'.repeat(32)}`);
  });
  it('server re-validates and truncates source, never stores junk', () => {
    expect(parseSource('x~oct-drop')).toBe('x~oct-drop');
    expect(parseSource('X.COM')).toBe('x.com');
    expect(parseSource('../../etc')).toBe('etc');
    expect(parseSource('a~b~c')).toBe('direct');
    expect(parseSource(undefined)).toBe('direct');
    expect(parseSource('1.2.3.4'.repeat(10)).length).toBeLessThanOrEqual(24);
    expect(parseEvent({ site: 'editor', event: 'share', label: 'x', source: '/../x' })).toMatchObject({ source: 'x' });
  });
  it('aggregates mint_cta_click per day and source; legacy paths count as direct', () => {
    const t = Date.UTC(2026, 9, 15);
    const a = eventPathname({ site: 'editor', event: 'mint_cta_click', label: '5000', source: 'x~editor-share' }, t, 0.2);
    const b = eventPathname({ site: 'progress', event: 'mint_cta_click', label: 'none', source: 'direct' }, t, 0.3);
    const agg = aggregateEvents([parseEventPathname(a), parseEventPathname(a), parseEventPathname(b), parseEventPathname('events/editor/share/x/123-abc.json')]);
    expect(agg.mintCtaByDaySource['2026-10-15']).toEqual({ 'x~editor-share': 2, direct: 1 });
    expect(agg.mintCtaBySource.direct).toBe(1);
    expect(agg.bySite.editor.share.bySource.direct).toBe(1);
  });
});
