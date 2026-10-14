/** Server-side IPFS fetch. ipfs.io / dweb.link were sunset on 2026-09-21 and answer 429. */
export const SERVER_IPFS_GATEWAYS = [
  process.env.IPFS_GATEWAY,
  'https://ipfs.filebase.io/ipfs',
  'https://w3s.link/ipfs',
].filter(Boolean);

export const fetchIpfsImage = async (cid, { timeoutMs = 20000 } = {}) => {
  let lastError = null;
  for (const gateway of SERVER_IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}/${cid}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('image/')) {
        lastError = new Error(`${gateway} ${response.status} ${type}`);
        continue;
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('no gateway');
};
