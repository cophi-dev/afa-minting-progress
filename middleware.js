/**
 * Edge: real 404 for junk paths; keep SPA at `/` and known static/asset prefixes.
 */
const STATIC_FILE = /^\/(robots\.txt|sitemap\.xml|manifest\.json|og-image\.jpg|apple-touch-icon\.png|logo-mark\.png|index\.html)$/;
const STATIC_PREFIXES = [
  '/assets/',
  '/fonts/',
  '/images/',
  '/bayc-images/',
  '/hires/',
  '/favicon',
  '/favicon-frames/',
  '/api/',
  '/go/',
  '/ape/',
];
const BLOCKED_PREFIXES = /^\/(\.env|\.git|wp-admin|wp-login\.php|\.well-known\/acme-challenge)/i;

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname.includes('..') || BLOCKED_PREFIXES.test(pathname)) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  if (pathname === '/' || STATIC_FILE.test(pathname) || STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return;
  }

  if (!pathname.includes('.')) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};