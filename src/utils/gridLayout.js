export const TOTAL_TOKENS = 10000;
export const MOBILE_DEFAULT_ZOOM = 32;
export const DESKTOP_DEFAULT_ZOOM = 64;
/** @deprecated use getDefaultZoom() */
export const DEFAULT_ZOOM = MOBILE_DEFAULT_ZOOM;
export const OVERSCAN_ROWS = 1;

/** Horizontal inset on .nft-grid-wrapper — keep in sync with NFTGrid.css */
export const GRID_WRAPPER_PADDING = {
  mobile: 2,
  desktop: 12,
};

export const getGridWrapperPadding = (isMobile = window.innerWidth <= 768) =>
  (isMobile ? GRID_WRAPPER_PADDING.mobile : GRID_WRAPPER_PADDING.desktop);

/** Mobile shows 6 columns (5 on very narrow screens) so apes stay recognisable. */
export const MOBILE_COLUMNS = 6;

export const getMobileZoom = (screenWidth = window.innerWidth) => {
  const available = screenWidth - GRID_WRAPPER_PADDING.mobile * 2;
  const columns = screenWidth < 340 ? 5 : MOBILE_COLUMNS;
  return Math.max(MOBILE_DEFAULT_ZOOM, Math.floor(available / columns));
};

export const getDefaultZoom = (isMobile = window.innerWidth <= 768, screenWidth = window.innerWidth) =>
  (isMobile ? getMobileZoom(screenWidth) : DESKTOP_DEFAULT_ZOOM);

export const computeVisibleRange = (scrollTop, viewportHeight, zoom, totalRows) => {
  const rowHeight = zoom;
  const safeViewport = Math.max(viewportHeight, rowHeight * 2, window.innerHeight * 0.5);
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
  const endRow = Math.min(
    totalRows,
    Math.max(
      startRow + 1,
      Math.ceil((scrollTop + safeViewport) / rowHeight) + OVERSCAN_ROWS
    )
  );
  return { startRow, endRow };
};

/** Columns that actually fit in the scroll viewport — must match rendered grid width. */
export const computeGridMetrics = ({
  zoom = DEFAULT_ZOOM,
  screenWidth = window.innerWidth,
  isMobile = window.innerWidth <= 768,
  tokenCount = TOTAL_TOKENS,
} = {}) => {
  const inset = getGridWrapperPadding(isMobile) * 2;
  const availableWidth = Math.max(zoom, screenWidth - inset);
  const cellsPerRow = Math.max(1, Math.min(Math.floor(availableWidth / zoom), 100));
  const gridWidth = cellsPerRow * zoom;
  const totalRows = Math.ceil(tokenCount / cellsPerRow);

  return { gridWidth, cellsPerRow, totalRows };
};

export const computeGridLayout = ({
  zoom = DEFAULT_ZOOM,
  screenWidth = window.innerWidth,
  isMobile = window.innerWidth <= 768,
} = {}) => {
  const { gridWidth, cellsPerRow, totalRows } = computeGridMetrics({ zoom, screenWidth, isMobile });
  const visibleRange = computeVisibleRange(0, window.innerHeight, zoom, totalRows);

  return { gridWidth, cellsPerRow, totalRows, visibleRange };
};
