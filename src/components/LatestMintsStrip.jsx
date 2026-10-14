import React, { useEffect, useState } from 'react';
import './LatestMintsStrip.css';

const timeAgo = (unix) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const latestCache = new Map();

export const useLatestMints = (limit = 8, enabled = true) => {
  const [latest, setLatest] = useState(() => latestCache.get(limit) ?? null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetch(`/api/latest-mints?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.latest) return;
        latestCache.set(limit, data.latest);
        if (!cancelled) setLatest(data.latest);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [limit, enabled]);

  return latest;
};

const LatestMintsStrip = ({ onMintClick, limit = 8, latest: provided = null }) => {
  const fetched = useLatestMints(limit, !provided);
  const latest = provided ?? fetched;

  if (!latest || latest.length === 0) return null;

  return (
    <section className="latest-strip" aria-label="Latest mints">
      <h2 className="latest-strip-title">Latest mints</h2>
      <ol className="latest-strip-list">
        {latest.map((mint) => (
          <li key={mint.token_id}>
            <button type="button" className="latest-strip-item" onClick={() => onMintClick?.(mint.token_id)}>
              <img src={`/images/${mint.token_id}.webp`} alt="" width="40" height="40" loading="lazy" />
              <span className="latest-strip-copy">
                <span className="latest-strip-id">#{mint.token_id}</span>
                <span className="latest-strip-meta">
                  {timeAgo(mint.timestamp)}
                  {mint.is_gift && (
                    <svg className="latest-strip-gift" viewBox="0 0 16 16" width="11" height="11" role="img" aria-label="Gift">
                      <path fill="currentColor" d="M2 7h12v2H2zM3 9h4v5H3zm6 0h4v5H9zM7 7h2v7H7zM8 6C6.5 3 4 3.5 4.5 5S8 6 8 6zm0 0c1.5-3 4-2.5 3.5-1S8 6 8 6z" />
                    </svg>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default LatestMintsStrip;
