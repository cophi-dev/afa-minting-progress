import React, { useEffect, useRef, useState } from 'react';
import { AFA_CLAIM_URL } from '../constants/editor';
import { setAfaIpfsImageSrc, tryNextAfaIpfsGateway } from '../utils/imageUrls';
import './SiteHeader.css';

const EDITOR_HOME = 'https://afa-editor.app';

const formatUpdated = (timestamp) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatMintDate = (timestamp) => new Date(timestamp * 1000).toLocaleString(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const SiteHeader = ({
  mintedCount = 0,
  mintDataLoading = false,
  updatedAt = null,
  fetchError = null,
  onRetry,
  latestMints = [],
  onMintClick,
}) => {
  const headerRef = useRef(null);
  const [latestOpen, setLatestOpen] = useState(false);
  const countReady = mintedCount > 0 || Boolean(updatedAt) || (!mintDataLoading && !fetchError);
  const countLabel = countReady
    ? `${mintedCount.toLocaleString()} of 10,000 minted`
    : fetchError
      ? 'Mint count unavailable'
      : 'Checking the chain…';
  const mintPercent = countReady
    ? ((mintedCount / 10000) * 100).toFixed(mintedCount >= 1000 ? 1 : 2)
    : null;
  const updatedLabel = formatUpdated(updatedAt);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;

    const apply = () => {
      document.documentElement.style.setProperty('--site-header-offset', `${el.offsetHeight}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header-intro">
        <div className="site-header-copy">
          <h1 className="site-title">AFA Mint Progress</h1>
          <p className="site-tagline">See which of the 10,000 apes already have an Ape Facing Ape.</p>
        </div>
        <div className="site-header-actions">
          <a
            className="mint-cta"
            href={AFA_CLAIM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mint on apefacingapes.com
          </a>
          <a
            className="editor-link"
            href={EDITOR_HOME}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the editor
          </a>
        </div>
      </div>

      <div className="mint-meter">
        <div className="mint-meter-row">
          <p className="mint-count">{countLabel}</p>
          {mintPercent != null && <p className="mint-percent">{mintPercent}%</p>}
        </div>
        <div
          className="mint-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={10000}
          aria-valuenow={countReady ? mintedCount : 0}
          aria-label="Apes minted"
        >
          <div
            className="mint-bar-fill"
            style={{ width: countReady ? `${(mintedCount / 10000) * 100}%` : '0%' }}
          />
        </div>
        <p className="mint-updated">
          {updatedLabel
            ? `Last updated ${updatedLabel}${mintDataLoading ? ' · updating' : ''}`
            : 'Last updated —'}
        </p>
        {fetchError && (
          <div className="mint-error" role="alert">
            <p>Couldn&apos;t load mint data. {fetchError}</p>
            <button type="button" className="retry-button" onClick={onRetry} disabled={mintDataLoading}>
              {mintDataLoading ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}
      </div>

      <div className="mint-legend">
        <span className="legend-item">
          <i className="legend-swatch minted" aria-hidden="true" />
          Minted
        </span>
        <span className="legend-item">
          <i className="legend-swatch unminted" aria-hidden="true" />
          Not minted
        </span>
        <button
          type="button"
          className="latest-toggle"
          aria-expanded={latestOpen}
          onClick={() => setLatestOpen((open) => !open)}
        >
          {latestOpen ? 'Hide latest mints' : 'Latest mints'}
        </button>
      </div>

      {latestOpen && (
        <ul className="latest-mints">
          {latestMints.length === 0 && (
            <li className="latest-empty">No mints loaded yet.</li>
          )}
          {latestMints.map((mint) => (
            <li key={mint.tokenId}>
              <button
                type="button"
                className="latest-mint"
                onClick={() => onMintClick?.(mint.tokenId)}
              >
                <img
                  src={`/images/${mint.tokenId}.webp`}
                  alt=""
                  width="36"
                  height="36"
                  onError={async (event) => {
                    const img = event.currentTarget;
                    if (img.dataset.fallback === 'png') {
                      img.dataset.fallback = 'ipfs';
                      await setAfaIpfsImageSrc(img, mint.tokenId, true);
                      return;
                    }
                    if (img.dataset.fallback === 'ipfs') {
                      await tryNextAfaIpfsGateway(img, mint.tokenId, true);
                      return;
                    }
                    img.dataset.fallback = 'png';
                    img.src = `/images/${mint.tokenId}.png`;
                  }}
                />
                <span className="latest-mint-copy">
                  <span className="latest-mint-id">
                    #{mint.tokenId}
                    {mint.isTransfer && <span className="latest-transfer">Transfer</span>}
                  </span>
                  <span className="latest-mint-time">{formatMintDate(mint.timestamp)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
};

export default SiteHeader;
