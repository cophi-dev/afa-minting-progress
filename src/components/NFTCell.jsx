import React, { memo } from 'react';
import {
  getAfaThumbnailUrl,
  getAfaThumbnailFallbackUrl,
  getBaycThumbnailUrl,
  getBaycThumbnailFallbackUrl,
  ipfsToHttpUrl,
  setAfaIpfsImageSrc,
  tryNextAfaIpfsGateway,
} from '../utils/imageUrls';
import { getBaycMetadataAsync } from '../data/baycMetadata';
import { markImageCached } from '../utils/imageCache';

const getImageSrc = (tokenId, showBayc) =>
  showBayc ? getBaycThumbnailUrl(tokenId) : getAfaThumbnailUrl(tokenId);

const getFallbackSrc = (tokenId, showBayc) =>
  showBayc ? getBaycThumbnailFallbackUrl(tokenId) : getAfaThumbnailFallbackUrl(tokenId);

const NFTCell = memo(({
  tokenId,
  zoom,
  isMinted,
  owner,
  showBayc,
  isSelected,
  eager = false,
}) => {
  const src = getImageSrc(tokenId, showBayc);
  const fallbackSrc = getFallbackSrc(tokenId, showBayc);

  const handleImageError = async (e) => {
    const img = e.target;
    const stage = img.dataset.fallbackStage || 'webp';

    if (stage === 'webp') {
      img.dataset.fallbackStage = 'png';
      img.src = fallbackSrc;
      return;
    }

    if (showBayc) {
      if (img.dataset.fallbackStage === 'bayc-done') return;
      img.dataset.fallbackStage = 'bayc-done';
      const metadata = await getBaycMetadataAsync(tokenId);
      if (metadata?.image) {
        const baycFallback = ipfsToHttpUrl(metadata.image);
        markImageCached(baycFallback);
        img.src = baycFallback;
      }
      return;
    }

    // Unminted AFAs: thumbnails only — never load high-res IPFS.
    if (!isMinted) return;

    if (img.dataset.fallbackStage === 'ipfs') {
      if (await tryNextAfaIpfsGateway(img, tokenId, true)) return;
      return;
    }

    img.dataset.fallbackStage = 'ipfs';
    const ipfsUrl = await setAfaIpfsImageSrc(img, tokenId, true);
    if (ipfsUrl) {
      markImageCached(ipfsUrl);
    }
  };

  return (
    <div
      id={`nft-${tokenId}`}
      className={`nft-cell ${isMinted ? 'minted' : 'unminted'}${isSelected ? ' selected' : ''}`}
      data-token-id={tokenId}
      title={isMinted && owner ? `#${tokenId} — ${owner.slice(0, 8)}…` : `#${tokenId}`}
      style={{ width: zoom, height: zoom, '--cell-zoom': zoom }}
    >
      <img
        src={src}
        alt=""
        decoding={eager ? 'sync' : 'async'}
        fetchPriority={eager ? 'high' : 'auto'}
        loading={eager ? 'eager' : 'lazy'}
        width={zoom}
        height={zoom}
        draggable={false}
        onLoad={() => markImageCached(src)}
        onError={handleImageError}
      />
    </div>
  );
}, (prev, next) =>
  prev.tokenId === next.tokenId &&
  prev.zoom === next.zoom &&
  prev.isMinted === next.isMinted &&
  prev.showBayc === next.showBayc &&
  prev.isSelected === next.isSelected &&
  prev.owner === next.owner &&
  prev.eager === next.eager
);

NFTCell.displayName = 'NFTCell';

export default NFTCell;
