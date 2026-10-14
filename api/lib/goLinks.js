/** Allow-listed redirect targets for /go/<slug>. Never add claim links here. */
export const GO_TARGETS = {
  mint: 'https://www.apefacingapes.com/',
  editor: 'https://afa-editor.app/',
  progress: 'https://afa-mint-progress.vercel.app/',
};

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

export const parseSlug = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const slug = raw.toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
};

/**
 * Each slug resolves to ONE fixed target. Query params (e.g. ?to=) are ignored,
 * so /go/* can never be used as an open redirect.
 */
export const targetForSlug = (slug) => {
  if (typeof slug !== 'string') return null;
  if (slug === 'editor' || slug.startsWith('editor-')) return 'editor';
  if (slug === 'progress' || slug.startsWith('progress-')) return 'progress';
  return 'mint';
};

export const parseTarget = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return Object.prototype.hasOwnProperty.call(GO_TARGETS, raw) ? raw : null;
};

/** Slugs used by links on the progress site itself (not shared on X). */
export const INTERNAL_SLUGS = new Set(['ape-page', 'see-your-afa']);

export const buildTargetUrl = (target, slug) => {
  const url = new URL(GO_TARGETS[target]);
  const internal = INTERNAL_SLUGS.has(slug);
  url.searchParams.set('utm_source', internal ? 'afa-progress' : 'x');
  url.searchParams.set('utm_medium', internal ? 'referral' : 'social');
  url.searchParams.set('utm_campaign', slug);
  return url.toString();
};

export const CLICK_PREFIX = 'clicks/';

export const clickPathname = (slug, target, now = Date.now(), rand = Math.random()) =>
  `${CLICK_PREFIX}${slug}/${target}/${now}-${Math.floor(rand * 1e9).toString(36)}.json`;

/** clicks/<slug>/<target>/<ms>-<rand>.json → { slug, target, ts } */
export const parseClickPathname = (pathname) => {
  const match = /^clicks\/([a-z0-9-]+)\/([a-z]+)\/(\d+)-[a-z0-9]+\.json$/.exec(pathname);
  if (!match) return null;
  return { slug: match[1], target: match[2], ts: Number(match[3]) };
};

export const aggregateClicks = (entries) => {
  const bySlug = {};
  let total = 0;
  for (const entry of entries) {
    if (!entry) continue;
    total += 1;
    const day = new Date(entry.ts).toISOString().slice(0, 10);
    const slot = bySlug[entry.slug] ??= { total: 0, byTarget: {}, byDay: {} };
    slot.total += 1;
    slot.byTarget[entry.target] = (slot.byTarget[entry.target] ?? 0) + 1;
    slot.byDay[day] = (slot.byDay[day] ?? 0) + 1;
  }
  return { total, bySlug };
};
