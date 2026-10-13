import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import SiteHeader from './SiteHeader';
import ControlPanel from './ControlPanel';
import VirtualGrid from './VirtualGrid';
import { getAfaThumbnailUrl, getBaycThumbnailUrl, prefetchHiresManifest } from '../utils/imageUrls';
import { loadBaycMapping, getTraitCatalog, filterTokenIds } from '../data/baycMetadata';
import { loadMintCache, prefetchMintStatus, refreshMintStatus } from '../services/mintStatusCache';
import { buildAfaEditorUrl, AFA_CLAIM_URL } from '../constants/editor';
import {
  TOTAL_TOKENS,
  getDefaultZoom,
  computeVisibleRange,
  computeGridLayout,
  computeGridMetrics,
} from '../utils/gridLayout';
import {
  createSequentialTokenIds,
  shuffleTokenIds,
} from '../utils/shuffleTokenIds';
import './NFTGrid.css';

const ApeDetailsModal = lazy(() => import('./ApeDetailsModal'));

const initialIsMobile = window.innerWidth <= 768;
const initialLayout = computeGridLayout({
  zoom: getDefaultZoom(initialIsMobile),
  isMobile: initialIsMobile,
});
const cachedMint = loadMintCache();

function NFTGrid() {
  const [mintedStatus, setMintedStatus] = useState(() => cachedMint?.statuses ?? new Map());
  const [mintedCountFromChain, setMintedCountFromChain] = useState(() => (
    Number.isFinite(cachedMint?.mintedCount) ? cachedMint.mintedCount : null
  ));
  const [mintDataLoading, setMintDataLoading] = useState(!cachedMint);
  const [latestMints, setLatestMints] = useState(() => cachedMint?.latestMints ?? []);
  const [updatedAt, setUpdatedAt] = useState(() => cachedMint?.savedAt ?? null);
  const [fetchError, setFetchError] = useState(null);
  const [selectedApe, setSelectedApe] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  const [zoom, setZoom] = useState(() => getDefaultZoom(window.innerWidth <= 768));
  const [showBayc, setShowBayc] = useState(false);
  const [traitFilters, setTraitFilters] = useState({});
  const [traitCatalog, setTraitCatalog] = useState(null);
  const [traitCatalogLoading, setTraitCatalogLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [cellTip, setCellTip] = useState(null);
  const [visibleRange, setVisibleRange] = useState(initialLayout.visibleRange);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [shuffledTokenIds, setShuffledTokenIds] = useState(null);

  const gridRef = useRef(null);
  const mintedStatusRef = useRef(mintedStatus);
  const rangeRef = useRef(initialLayout.visibleRange);
  const mintedCount = mintedCountFromChain ?? mintedStatus.size;

  mintedStatusRef.current = mintedStatus;

  const filteredTokenIds = useMemo(
    () => filterTokenIds(traitFilters),
    [traitFilters]
  );

  const filteredMintedCount = useMemo(() => {
    if (!filteredTokenIds?.length) return null;
    let count = 0;
    filteredTokenIds.forEach((tokenId) => {
      if (mintedStatus.has(tokenId)) count += 1;
    });
    return count;
  }, [filteredTokenIds, mintedStatus]);

  const displayTokenList = shuffleEnabled ? shuffledTokenIds : filteredTokenIds;
  const displayTokenCount = displayTokenList?.length ?? TOTAL_TOKENS;

  const { gridWidth, cellsPerRow, totalRows } = useMemo(
    () => computeGridMetrics({
      zoom,
      screenWidth,
      isMobile,
      tokenCount: displayTokenCount,
    }),
    [zoom, screenWidth, isMobile, displayTokenCount]
  );

  const syncVisibleRange = useCallback((scrollTop, viewportHeight) => {
    const next = computeVisibleRange(scrollTop, viewportHeight, zoom, totalRows);
    const prev = rangeRef.current;
    if (prev.startRow === next.startRow && prev.endRow === next.endRow) return;
    rangeRef.current = next;
    setVisibleRange(next);
  }, [zoom, totalRows]);

  useEffect(() => {
    const prefetchModal = () => import('./ApeDetailsModal');
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(prefetchModal, { timeout: 4000 });
      return () => cancelIdleCallback(idleId);
    }
    const timeoutId = setTimeout(prefetchModal, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    prefetchHiresManifest();
    prefetchMintStatus()
      .then((result) => {
        if (cancelled || !result) return;
        setLatestMints(result.latestMints);
        setMintedStatus(result.statuses);
        setMintedCountFromChain(result.mintedCount);
        setUpdatedAt(Date.now());
        setFetchError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching minted status:', error);
        setFetchError(error.message || 'Failed to load mint data');
      })
      .finally(() => {
        if (!cancelled) setMintDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
        setScreenWidth(window.innerWidth);
        const el = gridRef.current;
        if (el) syncVisibleRange(el.scrollTop, el.clientHeight);
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [syncVisibleRange]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver(() => {
      syncVisibleRange(el.scrollTop, el.clientHeight || window.innerHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncVisibleRange]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;

    let rafId = null;
    const onScroll = () => {
      setCellTip((current) => (current ? null : current));
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncVisibleRange(el.scrollTop, el.clientHeight || window.innerHeight);
      });
    };

    syncVisibleRange(el.scrollTop, el.clientHeight || window.innerHeight);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [syncVisibleRange]);

  useEffect(() => {
    const el = gridRef.current;
    if (el) {
      syncVisibleRange(el.scrollTop, el.clientHeight || window.innerHeight);
    }
  }, [syncVisibleRange, cellsPerRow, zoom]);

  const openApeModal = useCallback((tokenId) => {
    const status = mintedStatusRef.current.get(tokenId);
    const isMinted = Boolean(status);

    setSelectedTokenId(tokenId);
    setSelectedApe({
      tokenId,
      isMinted,
      owner: status?.owner ?? null,
      mintDate: status ? new Date(status.timestamp * 1000).toISOString() : null,
      image: getAfaThumbnailUrl(tokenId),
      baycImage: getBaycThumbnailUrl(tokenId),
      editorUrl: isMinted ? buildAfaEditorUrl(tokenId) : null,
      claimUrl: AFA_CLAIM_URL,
    });
    setModalOpen(true);
  }, []);

  const handleGridClick = useCallback((event) => {
    const cell = event.target.closest('[data-token-id]');
    if (!cell) return;

    const tokenId = Number(cell.dataset.tokenId);
    if (Number.isNaN(tokenId)) return;

    openApeModal(tokenId);
  }, [openApeModal]);

  const showCellTip = useCallback((event) => {
    const cell = event.target.closest?.('[data-token-id]');
    if (!cell) return;

    const tokenId = Number(cell.dataset.tokenId);
    if (Number.isNaN(tokenId)) return;

    const minted = cell.classList.contains('minted');
    const text = minted ? `Minted #${tokenId}` : `Not minted #${tokenId}`;
    const rect = cell.getBoundingClientRect();
    const width = Math.ceil(text.length * 7.2 + 16);
    const height = 24;
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
    const toolsOffset = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--site-tools-offset')
    ) || 0;
    const toolsTop = window.innerHeight - toolsOffset;
    let x = rect.left + rect.width / 2 - width / 2;
    let y = rect.top + rect.height / 2 - height / 2;
    x = Math.max(6, Math.min(x, window.innerWidth - width - 6));
    y = Math.max(headerBottom + 4, Math.min(y, toolsTop - height - 4));
    setCellTip((prev) => (
      prev && prev.tokenId === tokenId && prev.x === x && prev.y === y ? prev : { tokenId, text, x, y }
    ));
  }, []);

  const handleTokenSearch = useCallback((tokenId) => {
    const el = gridRef.current;
    if (!el) return;

    let displayIndex = tokenId;
    if (displayTokenList) {
      displayIndex = displayTokenList.indexOf(tokenId);
      if (displayIndex === -1) return;
    }

    const row = Math.floor(displayIndex / cellsPerRow);
    const targetScroll = Math.max(0, row * zoom - el.clientHeight / 2);
    el.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setSelectedTokenId(tokenId);
    setTimeout(() => setSelectedTokenId(null), 3000);
  }, [cellsPerRow, zoom, displayTokenList]);

  const scrollGridToTop = useCallback(() => {
    const el = gridRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShuffleToggle = useCallback(() => {
    setShuffleEnabled((prev) => {
      if (prev) setShuffledTokenIds(null);
      return !prev;
    });
    scrollGridToTop();
  }, [scrollGridToTop]);

  useEffect(() => {
    if (!shuffleEnabled) return;
    const source = filteredTokenIds ?? createSequentialTokenIds(TOTAL_TOKENS);
    setShuffledTokenIds(shuffleTokenIds(source));
    scrollGridToTop();
  }, [filteredTokenIds, shuffleEnabled, scrollGridToTop]);

  const handleZoomChange = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  const handleShowBayc = useCallback((show) => {
    setShowBayc(show);
    if (show) loadBaycMapping();
  }, []);

  const handleTraitFiltersChange = useCallback((nextFilters) => {
    setTraitFilters(nextFilters);
    const el = gridRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTraitFilterOpen = useCallback(() => {
    if (traitCatalog || traitCatalogLoading) return;
    setTraitCatalogLoading(true);
    loadBaycMapping()
      .then(() => setTraitCatalog(getTraitCatalog()))
      .finally(() => setTraitCatalogLoading(false));
  }, [traitCatalog, traitCatalogLoading]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedTokenId(null);
  }, []);

  const handleRetryMintStatus = useCallback(() => {
    setMintDataLoading(true);
    refreshMintStatus()
      .then((result) => {
        if (!result) return;
        setLatestMints(result.latestMints);
        setMintedStatus(result.statuses);
        setMintedCountFromChain(result.mintedCount);
        setUpdatedAt(Date.now());
        setFetchError(null);
      })
      .catch((error) => {
        setFetchError(error.message || 'Failed to load mint data');
      })
      .finally(() => setMintDataLoading(false));
  }, []);

  const showSkeleton = mintDataLoading && mintedStatus.size === 0;

  return (
    <>
      <SiteHeader
        mintedCount={mintedCount}
        mintDataLoading={mintDataLoading}
        updatedAt={updatedAt}
        fetchError={fetchError}
        onRetry={handleRetryMintStatus}
        latestMints={latestMints}
        onMintClick={openApeModal}
      />
      <div className="nft-grid-wrapper" ref={gridRef} aria-busy={showSkeleton}>
        <div
          className={`nft-grid${filteredTokenIds ? ' filtered' : ''}${shuffleEnabled ? ' shuffled' : ''}`}
          onClick={handleGridClick}
          onPointerOver={showCellTip}
          onPointerDown={showCellTip}
          onPointerLeave={() => setCellTip(null)}
          style={{
            width: gridWidth,
            height: totalRows * zoom,
            margin: isMobile ? '0' : '0 auto',
          }}
        >
          {displayTokenList?.length === 0 && (
            <div className="nft-grid-empty">
              <p>No apes match the selected traits.</p>
            </div>
          )}
          <VirtualGrid
            visibleRange={visibleRange}
            cellsPerRow={cellsPerRow}
            zoom={zoom}
            gridWidth={gridWidth}
            mintedStatus={mintedStatus}
            showBayc={showBayc}
            selectedTokenId={selectedTokenId}
            totalTokens={displayTokenCount}
            tokenIdList={displayTokenList}
            skeleton={showSkeleton}
          />
        </div>
      </div>

      {cellTip && (
        <div className="cell-tooltip" style={{ left: cellTip.x, top: cellTip.y }}>
          {cellTip.text}
        </div>
      )}

      <Suspense fallback={null}>
        <ApeDetailsModal
          open={modalOpen}
          onClose={handleModalClose}
          apeData={selectedApe}
        />
      </Suspense>

      <ControlPanel
        onTokenSearch={handleTokenSearch}
        onZoomChange={handleZoomChange}
        onShowBayc={handleShowBayc}
        zoom={zoom}
        showBayc={showBayc}
        isMobile={isMobile}
        hidden={modalOpen}
        traitFilters={traitFilters}
        onTraitFiltersChange={handleTraitFiltersChange}
        traitCatalog={traitCatalog}
        traitCatalogLoading={traitCatalogLoading}
        onTraitFilterOpen={handleTraitFilterOpen}
        filteredMatchCount={filteredTokenIds?.length ?? null}
        filteredMintedCount={filteredMintedCount}
        mintDataLoading={mintDataLoading}
        shuffleEnabled={shuffleEnabled}
        onShuffleToggle={handleShuffleToggle}
      />
    </>
  );
}

export default NFTGrid;
