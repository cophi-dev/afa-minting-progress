import React, { useEffect, useRef, useState } from 'react';
import { setAfaIpfsImageSrc, tryNextAfaIpfsGateway } from '../utils/imageUrls';
import { claimUrl } from '../constants/links';
import './SiteHeader.css';
import LatestMintsStrip, { useLatestMints } from './LatestMintsStrip';

export const EDITOR_HOME = 'https://afa-editor.app';

const DETAILS_KEY = 'afa-progress:details-open';

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

/** Collapsible list used inside the Controls sheet. */
export const LatestMints = ({ latestMints = [], onMintClick }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="latest-block">
      <button
        type="button"
        className="latest-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide latest mints' : 'Latest mints'}
      </button>
      {open && (
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
                  width="32"
                  height="32"
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
    </div>
  );
};

const readDetailsOpen = () => {
  try {
    return window.localStorage.getItem(DETAILS_KEY) === '1';
  } catch {
    return false;
  }
};

const SiteHeader = ({
  mintedCount = 0,
  mintDataLoading = false,
  updatedAt = null,
  fetchError = null,
  onRetry,
  onOpenBlur,
  onMintClick,
}) => {
  const headerRef = useRef(null);
  const [detailsOpen, setDetailsOpen] = useState(readDetailsOpen);
  const latest = useLatestMints(8);
  const countReady = mintedCount > 0 || Boolean(updatedAt) || (!mintDataLoading && !fetchError);
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

  const toggleDetails = () => {
    setDetailsOpen((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(DETAILS_KEY, next ? '1' : '0');
      } catch {
        // storage blocked: keep in memory only
      }
      return next;
    });
  };

  return (
    <header className={`site-header${detailsOpen ? ' details-open' : ''}`} ref={headerRef}>
      <div className="site-header-row">
        <a className="site-brand" href="/" aria-label="AFA Mint Progress home">
          <img className="site-logo" src="/logo-mark.png" alt="Ape Facing Apes" width="48" height="41" />
          <h1 className="site-title">Mint Progress</h1>
        </a>

        <div className="mint-meter">
          <p className="mint-count">
            {countReady ? (
              <>
                <span className="mint-count-number">{mintedCount.toLocaleString('en-US')}</span>
                <span className="mint-count-total"> of 10,000 minted</span>
              </>
            ) : (
              <span className="mint-count-total">{fetchError ? 'Mint count unavailable' : 'Checking the chain…'}</span>
            )}
          </p>
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
              style={{ width: countReady ? `${Math.max((mintedCount / 10000) * 100, 0.8)}%` : '0%' }}
            />
          </div>
        </div>

        {latest && latest.length > 0 && (
          <div className="latest-line">
            <button type="button" className="latest-line-label" onClick={toggleDetails} aria-expanded={detailsOpen}>
              Latest →
            </button>
            <ol className="latest-line-list">
              {latest.slice(0, 8).map((mint) => (
                <li key={mint.token_id}>
                  <button
                    type="button"
                    className="latest-line-item"
                    onClick={() => onMintClick?.(mint.token_id)}
                    aria-label={`AFA #${mint.token_id}`}
                    title={`AFA #${mint.token_id}`}
                  >
                    <img src={`/images/${mint.token_id}.webp`} alt="" width="28" height="28" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button
          type="button"
          className="details-toggle"
          aria-expanded={detailsOpen}
          aria-controls="site-details"
          onClick={toggleDetails}
        >
          Details
          <span className="details-chevron" aria-hidden="true">▾</span>
        </button>

        <a
          className="header-cta"
          href={claimUrl('progress-header')}
          target="_blank"
          rel="noopener noreferrer"
        >
          Mint to reveal
        </a>
      </div>

      {fetchError && (
        <div className="mint-error" role="alert">
          <p>Couldn&apos;t load mint data. {fetchError}</p>
          <button type="button" className="retry-button" onClick={onRetry} disabled={mintDataLoading}>
            {mintDataLoading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {detailsOpen && (
        <div className="site-details" id="site-details">
          <p className="site-tagline">See which of the 10,000 apes already have an Ape Facing Ape.</p>
          <div className="mint-meta">
            {mintPercent != null && <span className="mint-percent">{mintPercent}%</span>}
            <span className="mint-updated">
              {updatedLabel
                ? `Updated ${updatedLabel}${mintDataLoading ? ' · updating' : ''}`
                : 'Updated —'}
            </span>
            <span className="mint-legend">
              <span className="legend-item">
                <i className="legend-swatch minted" aria-hidden="true" />
                Minted
              </span>
              <span className="legend-item">
                <i className="legend-swatch unminted" aria-hidden="true" />
                Not minted
              </span>
            </span>
          </div>
          <LatestMintsStrip latest={latest} onMintClick={onMintClick} />
          <div className="site-details-actions">
            <button type="button" className="editor-link blur-open" onClick={onOpenBlur}>
              See your AFA
            </button>
            <a className="editor-link" href={EDITOR_HOME} target="_blank" rel="noopener noreferrer">
              Editor
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
