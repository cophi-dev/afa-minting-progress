/**
 * Cookieless click events for afa-editor.app and the progress page.
 * Stored as empty-ish blobs; everything we count lives in the pathname:
 * events/<site>/<event>/<label>/<source>/<ms>-<rand>.json. No IP, no cookie, no user id.
 * source = '<utm_source>~<utm_campaign>' from the session's landing URL, else the referrer domain, else 'direct'.
 */
export const EVENT_PREFIX = 'events/';

export const EVENT_SITES = new Set(['editor', 'progress']);

const APE_ID = /^(?:\d|[1-9]\d{1,3})$/;
const LABELS = {
  mint_cta_click: (v) => APE_ID.test(v) || v === 'none',
  share: (v) => v === 'x' || v === 'link',
  download: (v) => v === 'square' || v === 'wide' || v === 'none',
  apefest_toggle: (v) => v === 'on' || v === 'off',
  ape_select: (v) => v === 'minted' || v === 'unminted',
  open_editor: (v) => APE_ID.test(v) || v === 'none',
};

const SOURCE_PART = /[^a-z0-9.-]/g;
const cleanPart = (v, max) => String(v ?? '').toLowerCase().replace(SOURCE_PART, '').replace(/^[.-]+/, '').slice(0, max);

/** Allow-list chars [a-z0-9.-], one optional '~' separator, max 24+1+32 chars. Anything else → 'direct'. */
export const parseSource = (value) => {
  if (typeof value !== 'string' || value === '') return 'direct';
  const [src, campaign, ...rest] = value.toLowerCase().split('~');
  if (rest.length) return 'direct';
  const a = cleanPart(src, 24);
  if (!a) return 'direct';
  const b = campaign == null ? '' : cleanPart(campaign, 32);
  return b ? `${a}~${b}` : a;
};

export const EVENT_NAMES = new Set(Object.keys(LABELS));

/** Returns a clean { site, event, label } or null. Unknown values are rejected, never stored. */
export const parseEvent = (input) => {
  if (!input || typeof input !== 'object') return null;
  const site = String(input.site ?? '');
  const event = String(input.event ?? '');
  const label = input.label == null || input.label === '' ? 'none' : String(input.label).slice(0, 16);
  if (!EVENT_SITES.has(site) || !Object.prototype.hasOwnProperty.call(LABELS, event)) return null;
  if (event === 'open_editor' && site !== 'progress') return null;
  if (!LABELS[event](label)) return null;
  return { site, event, label, source: parseSource(input.source) };
};

export const eventPathname = ({ site, event, label, source = 'direct' }, now = Date.now(), rand = Math.random()) =>
  `${EVENT_PREFIX}${site}/${event}/${label}/${parseSource(source)}/${now}-${Math.floor(rand * 1e9).toString(36)}.json`;

export const parseEventPathname = (pathname) => {
  const m = /^events\/([a-z]+)\/([a-z_]+)\/([a-z0-9]+)\/(?:([a-z0-9.~-]+)\/)?(\d+)-[a-z0-9]+\.json$/.exec(pathname);
  if (!m) return null;
  return { site: m[1], event: m[2], label: m[3], source: m[4] || 'direct', ts: Number(m[5]) };
};

export const aggregateEvents = (entries) => {
  const bySite = {};
  const mintCtaBySource = {};
  const mintCtaByDaySource = {};
  let total = 0;
  let from = null;
  let to = null;
  for (const e of entries) {
    if (!e) continue;
    total += 1;
    from = from == null ? e.ts : Math.min(from, e.ts);
    to = to == null ? e.ts : Math.max(to, e.ts);
    const day = new Date(e.ts).toISOString().slice(0, 10);
    const site = bySite[e.site] ??= {};
    const slot = site[e.event] ??= { total: 0, byLabel: {}, byDay: {} };
    slot.total += 1;
    slot.byLabel[e.label] = (slot.byLabel[e.label] ?? 0) + 1;
    slot.byDay[day] = (slot.byDay[day] ?? 0) + 1;
    const source = e.source || 'direct';
    slot.bySource ??= {};
    slot.bySource[source] = (slot.bySource[source] ?? 0) + 1;
    if (e.event === 'mint_cta_click') {
      mintCtaBySource[source] = (mintCtaBySource[source] ?? 0) + 1;
      const d = mintCtaByDaySource[day] ??= {};
      d[source] = (d[source] ?? 0) + 1;
    }
  }
  return {
    total,
    range: { from: from == null ? null : new Date(from).toISOString(), to: to == null ? null : new Date(to).toISOString() },
    bySite,
    mintCtaBySource,
    mintCtaByDaySource,
  };
};
