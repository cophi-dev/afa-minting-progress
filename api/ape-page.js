import { apeCopy, isMinted, parseApeId } from './lib/apeState.js';

const SITE = 'https://afa-progress.com';
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const renderApePage = ({ id, minted, version = '1' }) => {
  const { title, subtitle } = apeCopy(id, minted);
  const url = `${SITE}/ape/${id}`;
  const og = `${SITE}/api/og-ape?id=${id}&v=${minted ? 'm' : 'u'}${version}`;
  const image = minted ? `/hires/${id}.webp` : `/api/blur-preview?id=${id}`;
  const fallback = `/images/${id}.webp`;
  const cta = minted
    ? `<a class="cta" href="https://afa-editor.app/?tokenId=${id}&utm_source=afa-progress&utm_medium=referral&utm_campaign=ape-page">Open in the editor</a>`
    : `<a class="cta" href="/go/ape-page?to=mint">Mint on apefacingapes.com</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · AFA</title>
<meta name="description" content="${esc(subtitle)}" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" />
<meta name="theme-color" content="#0b0b0c" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="AFA Mint Progress" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(subtitle)}" />
<meta property="og:image" content="${og}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(title)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@ApeFacingApes" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(subtitle)}" />
<meta name="twitter:image" content="${og}" />
<link rel="stylesheet" href="/fonts/inter.css" />
<style>
  *{box-sizing:border-box}html,body{margin:0;background:#0b0b0c;color:#fff;font-family:Inter,system-ui,sans-serif}
  header{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.1)}
  header img{height:40px;display:block}header a.nav{color:rgba(255,255,255,.7);text-decoration:none;font-weight:500}
  main{max-width:460px;margin:0 auto;padding:40px 20px;text-align:center}
  h1{font-weight:600;font-size:clamp(28px,6vw,40px);letter-spacing:-.02em;line-height:1.1;margin:0 0 12px}
  p{color:rgba(255,255,255,.7);font-size:17px;margin:0 0 24px}
  .ape{width:100%;max-width:320px;aspect-ratio:1;border-radius:12px;background:#151517;display:block;margin:0 auto 24px}
  .status{color:#6ee7a0}
  .cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:8px;background:#f5c542;color:#0b0b0c;font-weight:600;text-decoration:none}
  .more{display:block;margin-top:20px;color:rgba(255,255,255,.6)}
</style>
</head>
<body>
<header><a href="/" aria-label="AFA Mint Progress"><img src="/logo-mark.png" alt="Ape Facing Apes" /></a><a class="nav" href="/">Mint Progress</a></header>
<main>
<img class="ape" src="${image}" alt="${esc(title)}" width="320" height="320" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='${minted ? fallback : '/placeholder.png'}'}" />
<h1>${esc(title)}</h1>
<p>${minted ? `AFA #${id} is <span class="status">minted</span>. Open it in the editor and dress it up.` : 'Mint to reveal this Ape Facing Ape.'}</p>
${cta}
<a class="more" href="/">See all 10,000 apes</a>
</main>
</body>
</html>`;
};

export default async function handler(req, res) {
  const id = parseApeId(req.query?.id);
  if (id == null) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).send('Not found');
  }
  let minted = false;
  try {
    minted = await isMinted(id);
  } catch (error) {
    console.error('ape page mint lookup failed', error?.message);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(renderApePage({ id, minted }));
}
