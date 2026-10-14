import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from '@mui/material';
import { getBaycMetadata, getBaycMetadataAsync } from '../data/baycMetadata';
import {
  getAfaThumbnailFallbackUrl,
  getAfaLocalHiresUrl,
  getAfaServerHiresUrl,
  getBaycThumbnailUrl,
  getBaycThumbnailFallbackUrl,
  hasLocalHires,
  isLocalHiresSrc,
} from '../utils/imageUrls';
import { claimUrl, shortAddress } from '../constants/links';
import './ApeDetailsModal.css';

const MIN_HIRES_DIMENSION = 256;
const HIRES_BLUR_TIMEOUT_MS = 6000;

const formatMintDate = (iso) => new Date(iso).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const ApeDetailsModal = ({ open, onClose, apeData }) => {
  const [baycMetadata, setBaycMetadata] = useState(null);
  const [baseUrl, setBaseUrl] = useState(null);
  const [hiresUrl, setHiresUrl] = useState(null);
  const [hiresReady, setHiresReady] = useState(false);
  const [hiresPending, setHiresPending] = useState(false);
  const [traitsOpen, setTraitsOpen] = useState(false);
  const currentTokenRef = useRef(null);
  const timerRef = useRef(null);

  const stopPending = useCallback(() => setHiresPending(false), []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!open || !apeData) {
      currentTokenRef.current = null;
      setBaycMetadata(null);
      setBaseUrl(null);
      setHiresUrl(null);
      setHiresReady(false);
      setHiresPending(false);
      return undefined;
    }

    let cancelled = false;
    const { tokenId, image, isMinted } = apeData;
    currentTokenRef.current = tokenId;
    setBaseUrl(image);
    setHiresUrl(null);
    setHiresReady(false);
    setHiresPending(isMinted);
    setTraitsOpen(isMinted && window.matchMedia('(min-width: 900px)').matches);
    setBaycMetadata(getBaycMetadata(tokenId) ?? null);

    getBaycMetadataAsync(tokenId)
      .then((metadata) => { if (!cancelled) setBaycMetadata(metadata); })
      .catch(() => {});

    if (isMinted) {
      // Never keep a minted ape blurred: after the timeout the thumbnail shows sharp
      // and the hi-res still fades in when it arrives.
      timerRef.current = window.setTimeout(stopPending, HIRES_BLUR_TIMEOUT_MS);
      hasLocalHires(tokenId).then((local) => {
        if (!cancelled) setHiresUrl(local ? getAfaLocalHiresUrl(tokenId) : getAfaServerHiresUrl(tokenId));
      });
    }

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open, apeData, stopPending]);

  useEffect(() => {
    // One yellow button per screen: the header CTA hides while a card is open.
    const root = document.documentElement;
    root.classList.toggle('card-open', Boolean(open));
    return () => root.classList.remove('card-open');
  }, [open]);

  const isStale = (img) => {
    const tokenId = currentTokenRef.current;
    const src = img.currentSrc || img.src || '';
    return tokenId == null
      || !(src.includes(`/hires/${tokenId}.webp`) || src.includes(`tokenId=${tokenId}`));
  };

  const handleHiresLoad = (event) => {
    const img = event.currentTarget;
    if (isStale(img)) return;
    if (img.naturalWidth >= MIN_HIRES_DIMENSION) setHiresReady(true);
    stopPending();
  };

  const handleHiresError = (event) => {
    const img = event.currentTarget;
    if (isStale(img)) return;
    if (isLocalHiresSrc(img.currentSrc || img.src)) {
      setHiresUrl(getAfaServerHiresUrl(apeData.tokenId));
      return;
    }
    setHiresUrl(null);
    stopPending();
  };

  const handleBaseError = (event) => {
    const img = event.currentTarget;
    if (img.dataset.fallback) return;
    img.dataset.fallback = 'png';
    setBaseUrl(getAfaThumbnailFallbackUrl(apeData.tokenId));
  };

  if (!apeData) return null;

  const { tokenId, isMinted } = apeData;
  const title = isMinted ? `AFA #${tokenId}` : `Ape #${tokenId}`;
  const blurred = !isMinted || (hiresPending && !hiresReady);
  const attributes = baycMetadata?.attributes ?? [];
  const holder = apeData.ens || shortAddress(apeData.owner);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="ape-card-title">
      <div className="ape-card-backdrop" onClick={onClose} role="presentation">
        <article
          className={`ape-card ${isMinted ? 'is-minted' : 'is-unminted'}`}
          onClick={(event) => event.stopPropagation()}
          role="presentation"
        >
          <button type="button" className="ape-card-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
            </svg>
          </button>

          <div className="ape-card-media">
            {baseUrl && (
              <img
                key={`base-${baseUrl}`}
                className={`ape-card-img${blurred ? ' is-blurred' : ''}`}
                src={baseUrl}
                alt={title}
                onError={handleBaseError}
              />
            )}
            {isMinted && hiresUrl && (
              <img
                key={`hires-${hiresUrl}`}
                className={`ape-card-img ape-card-hires${hiresReady ? ' is-ready' : ''}`}
                src={hiresUrl}
                alt=""
                onLoad={handleHiresLoad}
                onError={handleHiresError}
              />
            )}
            {isMinted && hiresPending && !hiresReady && (
              <span className="ape-card-loading" aria-live="polite">Loading full artwork…</span>
            )}
          </div>

          <div className="ape-card-body">
            <div className="ape-card-head">
              <h2 id="ape-card-title" className="ape-card-title">{title}</h2>
              {isMinted && apeData.mintDate && (
                <span className="ape-card-date">
                  <i className="ape-card-dot" aria-hidden="true" />
                  Minted {formatMintDate(apeData.mintDate)}
                </span>
              )}
            </div>

            {!isMinted && (
              <figure className="ape-card-original">
                <img
                  src={getBaycThumbnailUrl(tokenId)}
                  alt={`Original BAYC #${tokenId}`}
                  width="56"
                  height="56"
                  onError={(event) => {
                    const img = event.currentTarget;
                    if (img.dataset.fallback) return;
                    img.dataset.fallback = 'png';
                    img.src = getBaycThumbnailFallbackUrl(tokenId);
                  }}
                />
                <figcaption>{`Original BAYC #${tokenId}`}</figcaption>
              </figure>
            )}

            {isMinted && holder && (
              <p className="ape-card-holder">
                <span className="ape-card-label">Holder</span>
                <span className="ape-card-address" title={apeData.owner || undefined}>{holder}</span>
              </p>
            )}

            {isMinted ? (
              apeData.editorUrl && (
                <a className="ape-card-cta" href={apeData.editorUrl} target="_blank" rel="noopener noreferrer">
                  Style this ape →
                </a>
              )
            ) : (
              <>
                <a
                  className="ape-card-cta"
                  href={claimUrl('card-unminted')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mint to reveal
                </a>
              </>
            )}

            {attributes.length > 0 && (
              <div className={`ape-card-traits${traitsOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="ape-card-traits-toggle"
                  aria-expanded={traitsOpen}
                  onClick={() => setTraitsOpen((value) => !value)}
                >
                  Traits
                  <span className="ape-card-chevron" aria-hidden="true">▾</span>
                </button>
                {traitsOpen && (
                  <dl className="ape-card-trait-list">
                    {attributes.map(({ trait_type: type, value }) => (
                      <div key={type} className="ape-card-trait">
                        <dt>{type}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
        </article>
      </div>
    </Modal>
  );
};

export default ApeDetailsModal;
