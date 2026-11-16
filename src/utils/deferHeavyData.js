/**
 * Load large JSON chunks after first paint so LCP (grid thumbnails) is not blocked.
 */
export const scheduleHeavyDataPrefetch = (loaders) => {
  const run = () => {
    loaders.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  };

  if (typeof window === 'undefined') return;

  const schedule = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 1);
    }
  };

  if (document.readyState === 'complete') {
    schedule();
    return;
  }

  window.addEventListener('load', schedule, { once: true });
};