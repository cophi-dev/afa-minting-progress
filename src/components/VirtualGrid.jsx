import React, { memo, useMemo } from 'react';
import NFTCell from './NFTCell';
import { TOTAL_TOKENS } from '../utils/gridLayout';

const EAGER_IMAGE_COUNT = 120;

const VirtualGrid = memo(({
  visibleRange,
  cellsPerRow,
  zoom,
  gridWidth,
  mintedStatus,
  showBayc,
  selectedTokenId,
  totalTokens = TOTAL_TOKENS,
  tokenIdList = null,
  skeleton = false,
}) => {
  const visibleTokenIds = useMemo(() => {
    const ids = [];
    const { startRow, endRow } = visibleRange;
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < cellsPerRow; col++) {
        const index = row * cellsPerRow + col;
        if (index >= totalTokens) break;
        const tokenId = tokenIdList ? tokenIdList[index] : index;
        if (tokenId !== undefined) ids.push(tokenId);
      }
    }
    return ids;
  }, [visibleRange, cellsPerRow, totalTokens, tokenIdList]);

  const { startRow } = visibleRange;
  const eagerCutoff = (visibleTokenIds[0] ?? 0) + EAGER_IMAGE_COUNT;

  return (
    <div
      className="nft-grid-visible"
      style={{
        position: 'absolute',
        top: startRow * zoom,
        left: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${cellsPerRow}, ${zoom}px)`,
        width: gridWidth,
      }}
    >
      {visibleTokenIds.map((tokenId) => {
        if (skeleton) {
          return (
            <div
              key={tokenId}
              className="nft-cell skeleton"
              style={{ width: zoom, height: zoom }}
              aria-hidden="true"
            />
          );
        }

        const status = mintedStatus.get(tokenId);
        return (
          <NFTCell
            key={tokenId}
            tokenId={tokenId}
            zoom={zoom}
            isMinted={Boolean(status)}
            owner={status?.owner}
            showBayc={showBayc}
            isSelected={selectedTokenId === tokenId}
            eager={tokenId < eagerCutoff}
          />
        );
      })}
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;
