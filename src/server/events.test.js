import { describe, expect, it } from 'vitest';
import { aggregateEvents, eventPathname, parseEvent, parseEventPathname } from '../../api/lib/events.js';

describe('click events', () => {
  it('accepts only allow-listed site/event/label', () => {
    expect(parseEvent({ site: 'editor', event: 'mint_cta_click', label: '1234' })).toEqual({ site: 'editor', event: 'mint_cta_click', label: '1234' });
    expect(parseEvent({ site: 'progress', event: 'mint_cta_click' })).toMatchObject({ label: 'none' });
    expect(parseEvent({ site: 'editor', event: 'share', label: 'x' })).not.toBeNull();
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
