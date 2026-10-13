import { invalidateImageCached, preloadImageCached } from './imageCache';

const IPFS_GATEWAYS = [
  import.meta.env.VITE_IPFS_GATEWAY,
  'https://ipfs.io/ipfs',
  'https://w3s.link/ipfs',
].filter(Boolean);

const uniqueGateways = [...new Set(IPFS_GATEWAYS)];

let imageCidsPromise = null;

const loadImageCids = async () => {
  if (!imageCidsPromise) {
    imageCidsPromise = import('../data/image_cids.json').then((module) => module.default);
  }
  return imageCidsPromise;
};

export const prefetchImageCids = () => loadImageCids();

export const getIpfsGatewayUrls = (cid) => {
  if (!cid) return [];
  return uniqueGateways.map((gateway) => `${gateway}/${cid}`);
};

export const buildIpfsUrl = (cid, gatewayIndex = 0) => {
  const gateway = uniqueGateways[gatewayIndex];
  return gateway && cid ? `${gateway}/${cid}` : null;
};

export const getAfaThumbnailUrl = (tokenId) => `/images/${tokenId}.webp`;

export const getAfaThumbnailFallbackUrl = (tokenId) => `/images/${tokenId}.png`;

export const getAfaLocalHiresUrl = (tokenId) => `/hires/${tokenId}.webp`;

export const isLocalHiresSrc = (src) =>
  typeof src === 'string' && src.includes('/hires/');

let hiresManifestPromise = null;

const loadHiresManifest = async () => {
  if (!hiresManifestPromise) {
    hiresManifestPromise = import('../data/hires_manifest.json')
      .then((module) => new Set(module.default.map(String)))
      .catch(() => new Set());
  }
  return hiresManifestPromise;
};

export const prefetchHiresManifest = () => loadHiresManifest();

export const hasLocalHires = async (tokenId) => {
  const manifest = await loadHiresManifest();
  return manifest.has(String(tokenId));
};

export const getBaycThumbnailUrl = (tokenId) => `/bayc-images/${tokenId}.webp`;

export const getBaycThumbnailFallbackUrl = (tokenId) => `/bayc-images/${tokenId}.png`;

export const ipfsToHttpUrl = (uri) => {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return buildIpfsUrl(uri.slice(7));
  return uri;
};

/** BAYC high-res from metadata IPFS — safe for all tokens (original BAYC artwork). */
export const getBaycHighResUrl = async (tokenId) => {
  const { getBaycMetadataAsync } = await import('../data/baycMetadata');
  const metadata = await getBaycMetadataAsync(tokenId);
  return ipfsToHttpUrl(metadata?.image);
};

export const getAfaIpfsCid = async (tokenId, isMinted) => {
  if (!isMinted) return null;

  const imageCids = await loadImageCids();
  return imageCids[tokenId] ?? null;
};

/** First gateway URL for a minted AFA — does not verify availability. */
export const getAfaIpfsUrl = async (tokenId, isMinted) => {
  const cid = await getAfaIpfsCid(tokenId, isMinted);
  return buildIpfsUrl(cid);
};

const IPFS_GATEWAY_TIMEOUT_MS = 10000;
const IPFS_GATEWAY_RETRIES = 2;
const IPFS_RETRY_DELAY_MS = 1500;

const ipfsSessionCacheKey = (cid) => `afa-ipfs-hit:${cid}`;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export const getCachedIpfsHit = (cid) => {
  if (!cid || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ipfsSessionCacheKey(cid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.url && Number.isFinite(parsed.gatewayIndex)) return parsed;
  } catch {
    return null;
  }
  return null;
};

export const cacheIpfsHit = (cid, url, gatewayIndex) => {
  if (!cid || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(ipfsSessionCacheKey(cid), JSON.stringify({ url, gatewayIndex }));
  } catch {
    // sessionStorage full or blocked — ignore
  }
};

/** Match a loaded image URL back to a gateway index (handles subdomain redirects). */
export const findGatewayIndexForSrc = (src, cid) => {
  if (!src || !cid || !src.includes(cid)) return -1;

  const urls = getIpfsGatewayUrls(cid);
  const exact = urls.findIndex((url) => src === url || src.startsWith(`${url}/`));
  if (exact >= 0) return exact;

  return uniqueGateways.findIndex((gateway) => {
    try {
      const { hostname } = new URL(gateway);
      return src.includes(hostname);
    } catch {
      return false;
    }
  });
};

/** Pick the next gateway index that has not been tried yet. */
export const getNextUntriedGatewayIndex = (triedIndices, urlCount) => {
  if (!urlCount) return -1;
  for (let index = 0; index < urlCount; index += 1) {
    if (!triedIndices.has(index)) return index;
  }
  return -1;
};

const preloadGatewayWithRetry = async (url) => {
  for (let attempt = 0; attempt <= IPFS_GATEWAY_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await sleep(IPFS_RETRY_DELAY_MS * attempt);
      invalidateImageCached(url);
    }
    const ok = await preloadImageCached(url, IPFS_GATEWAY_TIMEOUT_MS);
    if (ok) return true;
  }
  return false;
};

/** Resolve the first reachable IPFS gateway URL for a CID. */
export const resolveIpfsUrlWithMeta = async (cid) => {
  if (!cid) return null;

  const cached = getCachedIpfsHit(cid);
  if (cached) {
    const cachedOk = await preloadImageCached(cached.url, 5000);
    if (cachedOk) return { url: cached.url, gatewayIndex: cached.gatewayIndex };
    invalidateImageCached(cached.url);
  }

  const urls = getIpfsGatewayUrls(cid);
  for (let gatewayIndex = 0; gatewayIndex < urls.length; gatewayIndex += 1) {
    const url = urls[gatewayIndex];
    const ok = await preloadGatewayWithRetry(url);
    if (ok) {
      cacheIpfsHit(cid, url, gatewayIndex);
      return { url, gatewayIndex };
    }
  }

  return null;
};

export const resolveIpfsUrl = async (cid) => {
  const result = await resolveIpfsUrlWithMeta(cid);
  return result?.url ?? null;
};

/** Resolve a working high-res URL for a minted AFA. */
export const resolveAfaIpfsUrl = async (tokenId, isMinted) => {
  const result = await resolveAfaIpfsUrlWithMeta(tokenId, isMinted);
  return result?.url ?? null;
};

export const resolveAfaIpfsUrlWithMeta = async (tokenId, isMinted) => {
  const cid = await getAfaIpfsCid(tokenId, isMinted);
  return resolveIpfsUrlWithMeta(cid);
};

const getTriedFromImg = (img) => {
  const raw = img.dataset.ipfsTried || '';
  return new Set(
    raw.split(',').filter(Boolean).map((value) => Number(value)).filter((value) => Number.isFinite(value))
  );
};

const saveTriedToImg = (img, tried) => {
  img.dataset.ipfsTried = [...tried].join(',');
};

/** Try the next IPFS gateway after a failed image load. Returns true if a URL was set. */
export const tryNextIpfsGateway = (img, cid, triedIndices = null) => {
  if (!cid || !img) return false;

  const urls = getIpfsGatewayUrls(cid);
  const src = img.currentSrc || img.src;
  const trackedIndex = Number(img.dataset.ipfsGateway);
  const currentIndex = Number.isFinite(trackedIndex) && trackedIndex >= 0
    ? trackedIndex
    : findGatewayIndexForSrc(src, cid);

  const tried = triedIndices ?? getTriedFromImg(img);

  if (currentIndex >= 0) {
    invalidateImageCached(urls[currentIndex]);
    tried.add(currentIndex);
  }

  const nextIndex = getNextUntriedGatewayIndex(tried, urls.length);
  if (nextIndex < 0) {
    saveTriedToImg(img, tried);
    return false;
  }

  tried.add(nextIndex);
  saveTriedToImg(img, tried);
  img.dataset.ipfsGateway = String(nextIndex);
  img.src = urls[nextIndex];
  return true;
};

export const markIpfsGatewayIndex = (img, url, cid) => {
  if (!img || !url || !cid) return;

  const index = getIpfsGatewayUrls(cid).indexOf(url);
  if (index >= 0) {
    img.dataset.ipfsGateway = String(index);
  }
};

export const tryNextAfaIpfsGateway = async (img, tokenId, isMinted, triedIndices = null) => {
  const cid = await getAfaIpfsCid(tokenId, isMinted);
  return tryNextIpfsGateway(img, cid, triedIndices);
};

export const setAfaIpfsImageSrc = async (img, tokenId, isMinted) => {
  const cid = await getAfaIpfsCid(tokenId, isMinted);
  if (!cid || !img) return null;

  const result = await resolveIpfsUrlWithMeta(cid);
  if (!result) return null;

  markIpfsGatewayIndex(img, result.url, cid);
  img.src = result.url;
  return result.url;
};

export const preloadImage = (url) => preloadImageCached(url).then(() => undefined);
