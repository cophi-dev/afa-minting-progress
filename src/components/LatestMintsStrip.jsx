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

const LatestMintsStrip = ({ onMintClick, limit = 8 }) => {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/latest-mints?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data?.latest) setLatest(data.latest); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [limit]);

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
                  {mint.is_gift && <span className="latest-strip-gift">Gift</span>}
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
