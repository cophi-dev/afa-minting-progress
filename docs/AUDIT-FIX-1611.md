# Audit fixes 2026-11-16 (Philipp)

**Branch:** `fix/audit-1611` — do **not** merge or deploy from this PR without Philipp’s sign-off. No Vercel project / domain / preset changes.

## Canonical / domain choice

Canonical and `og:url` on the home page and `api/ape-page.js` use **`https://afa-mint-progress.vercel.app`** (see `index.html` comment). `afa-progress.com` remains wired in `vercel.json` redirects only; switching the public canonical to the apex domain is **Philipp’s product decision**.

## Security — blob writes

- `api/event.js` and `api/go/[slug].js`: writes only when `Origin`/`Referer` matches `api/lib/requestGuard.js` host allowlist, per-IP rate limit passes, and (for events) body ≤ 2 KB.
- `/go`: invalid slug pattern → 302 to mint site **without** blob write; valid slugs redirect as before.

## Performance (LCP)

- `mapping.json` and `image_cids.json` load via `scheduleHeavyDataPrefetch` after `window.load` + idle, not on the critical path in `src/index.js`.
- Vite `manualChunks` splits mapping and image CIDs.
- Preload `/images/0.webp` in `index.html`.

**Lighthouse mobile (local `preview`, Nov 2026):** performance **86** (baseline in audit ~64–70, **LCP 10.4 s**). After this branch: **LCP 3.0 s**, FCP 0.9 s. Full prod + CDN may differ slightly; target ≥ 90 on Vercel preview.

## Headers (`vercel.json`)

Site-wide: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Strict-Transport-Security`, `Content-Security-Policy-Report-Only` (non-blocking).

## SEO

- `public/robots.txt` — Allow + sitemap URL.
- `public/sitemap.xml` — regenerated on `npm run build` (`scripts/generate-sitemap.mjs`), `/ape/0` … `/ape/9999`.
- `middleware.js` — junk paths (e.g. `/.env`) → real 404; `/` SPA preserved.
- `og-image.jpg` — 1200×630 via `npm run resize-og-image`; meta dimensions updated.

## A11y

- Grid cells: descriptive `alt` on images (no `aria-label` on non-interactive `div`).
- Labels: 11px → 12px in header / strip / modal chrome.
- Latest mint avatars: 32×32 px touch targets.

## Verification checklist

| Check | Command / note |
|--------|----------------|
| Build | `npm run build` |
| Unit tests | `npm test` |
| Headers | `curl -sI https://<preview>/` |
| 404 | `curl -sI https://<preview>/.env` → 404 |
| Screens | 1280×… and 390×… home + `/ape/1234` |