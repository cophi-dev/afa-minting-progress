/**
 * Cookieless, fire-and-forget click events → /api/event (Vercel Blob counter).
 * Never throws, never awaits, never blocks navigation. No ids, cookies or storage.
 */
const ENDPOINT = '/api/event';

export const track = (event, label) => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
    const body = JSON.stringify({ site: 'progress', event, label: label == null ? 'none' : String(label) });
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
  } catch {
    // ignore: tracking must never affect the page
  }
};
