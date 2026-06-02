/** Bump when a deploy must invalidate client-side caches for all users. */
export const APP_CACHE_VERSION = '3';

export const MINT_STATUS_CACHE_KEY = 'afa-mint-status-v3';

const APP_CACHE_VERSION_KEY = 'afa-app-cache-version';

const LEGACY_CACHE_KEYS = ['afa-mint-status-v1', 'afa-mint-status-v2'];

export const purgeStaleClientCaches = () => {
  try {
    const storedVersion = localStorage.getItem(APP_CACHE_VERSION_KEY);
    if (storedVersion === APP_CACHE_VERSION) return;

    for (const key of LEGACY_CACHE_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(MINT_STATUS_CACHE_KEY);

    localStorage.setItem(APP_CACHE_VERSION_KEY, APP_CACHE_VERSION);
  } catch {
    // Private browsing or storage blocked — skip.
  }
};
