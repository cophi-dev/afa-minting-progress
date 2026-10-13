import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Slider,
  Switch,
  Paper,
  Typography,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TuneIcon from '@mui/icons-material/Tune';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import TraitFilter from './TraitFilter';
import { EDITOR_HOME, LatestMints } from './SiteHeader';
import './ControlPanel.css';

const sectionLabelSx = {
  color: 'rgba(255,255,255,0.55)',
  mb: 0.75,
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
};

const mobileSectionLabelSx = {
  ...sectionLabelSx,
  fontSize: '0.7rem',
  mb: 1,
};

const sliderSx = {
  color: '#6ee7a0',
  height: 4,
  mt: 0.25,
  '& .MuiSlider-track': { height: 4, backgroundColor: '#6ee7a0' },
  '& .MuiSlider-rail': { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  '& .MuiSlider-thumb': {
    width: 14,
    height: 14,
    backgroundColor: '#6ee7a0',
    border: '2px solid #fff',
    '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 5px rgba(110, 231, 160, 0.18)' },
    '&.Mui-active': { boxShadow: '0 0 0 7px rgba(110, 231, 160, 0.24)' },
  },
  '& .MuiSlider-mark': {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    width: 4,
    height: 4,
    borderRadius: '50%',
  },
  '& .MuiSlider-markLabel': {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: '12px',
    fontWeight: 700,
  },
};

const mobileSliderSx = {
  ...sliderSx,
  height: 5,
  py: 0.75,
  '& .MuiSlider-track': { height: 5 },
  '& .MuiSlider-rail': { height: 5 },
  '& .MuiSlider-thumb': {
    width: 18,
    height: 18,
    '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(110, 231, 160, 0.18)' },
    '&.Mui-active': { boxShadow: '0 0 0 9px rgba(110, 231, 160, 0.24)' },
  },
  '& .MuiSlider-mark': { width: 4, height: 4 },
  '& .MuiSlider-markLabel': {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: '13px',
    fontWeight: 700,
    mt: 0.5,
  },
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6ee7a0' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6ee7a0' },
  '& .MuiSwitch-track': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  '& .MuiSwitch-thumb': { backgroundColor: '#fff' },
};

const mobileSwitchSx = {
  ...switchSx,
};

const ControlPanel = ({
  onTokenSearch,
  onZoomChange,
  onShowBayc,
  zoom = 16,
  showBayc = false,
  isMobile = false,
  hidden = false,
  traitFilters = {},
  onTraitFiltersChange,
  traitCatalog = null,
  traitCatalogLoading = false,
  onTraitFilterOpen,
  filteredMatchCount = null,
  filteredMintedCount = null,
  mintDataLoading = false,
  docked = false,
  shuffleEnabled = false,
  onShuffleToggle,
  latestMints = [],
  onMintClick,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [traitFilterExpanded, setTraitFilterExpanded] = useState(false);
  const toolsRef = useRef(null);

  const activeTraitCount = Object.values(traitFilters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [isMobile]);

  useEffect(() => {
    const el = toolsRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--site-tools-offset', '0px');
      return undefined;
    }

    const apply = () => {
      const gap = parseFloat(getComputedStyle(el).bottom) || 0;
      document.documentElement.style.setProperty('--site-tools-offset', `${el.offsetHeight + gap}px`);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--site-tools-offset', '0px');
    };
  }, [isMobile, isExpanded, isMinimized, hidden]);

  useEffect(() => {
    if (!isMobile || !isExpanded) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, isExpanded]);

  const handleSearch = (e) => {
    e.preventDefault();
    const tokenId = parseInt(searchValue, 10);
    if (!Number.isNaN(tokenId) && tokenId >= 0 && tokenId < 10000) {
      onTokenSearch(tokenId);
      if (isMobile) closeMobilePanel();
    }
  };

  const openMobilePanel = () => {
    setIsExpanded((open) => !open);
    onTraitFilterOpen?.();
  };
  const closeMobilePanel = () => setIsExpanded(false);

  const openDesktopPanel = () => {
    setIsMinimized((minimized) => !minimized);
    onTraitFilterOpen?.();
  };

  const textFieldSx = {
    color: '#fff',
    fontSize: isMobile ? '16px' : '0.8125rem',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(255, 255, 255, 0.22)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#6ee7a0',
      borderWidth: 1,
    },
    '& .MuiInputBase-input': {
      py: isMobile ? 1.25 : 0.875,
      px: 1.25,
    },
  };

  const panelContent = (
    <>
      <Box sx={{ mb: isMobile ? 1 : 1.75 }} className="control-panel-trait-section">
        <TraitFilter
          catalog={traitCatalog}
          filters={traitFilters}
          onChange={onTraitFiltersChange}
          matchCount={filteredMatchCount}
          mintedCount={filteredMintedCount}
          mintDataLoading={mintDataLoading}
          loading={traitCatalogLoading}
          isMobile={isMobile}
          onExpand={onTraitFilterOpen}
          onExpandedChange={setTraitFilterExpanded}
        />
      </Box>

      <Box
        sx={{
          mb: isMobile ? 1.25 : 2,
          pt: isMobile ? 1 : 1.25,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Typography sx={isMobile ? mobileSectionLabelSx : sectionLabelSx}>Jump to token</Typography>
        <form onSubmit={handleSearch}>
          <TextField
            fullWidth
            size="small"
            placeholder="#0 – 9999"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            inputMode="numeric"
            InputProps={{
              endAdornment: (
                <IconButton
                  type="submit"
                  size="small"
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    p: isMobile ? 1 : 0.5,
                    minWidth: isMobile ? 44 : 'auto',
                    minHeight: isMobile ? 44 : 'auto',
                    '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <SearchIcon sx={{ fontSize: isMobile ? 20 : 16 }} />
                </IconButton>
              ),
              sx: textFieldSx,
            }}
          />
        </form>
      </Box>

      <Box sx={{ mb: isMobile ? 3 : 2.5 }}>
        <Typography
          sx={{
            ...(isMobile ? mobileSectionLabelSx : sectionLabelSx),
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <ZoomInIcon sx={{ fontSize: isMobile ? 14 : 12 }} />
          Zoom · {zoom}px
        </Typography>
        <Slider
          value={zoom}
          onChange={(_e, newValue) => onZoomChange(newValue)}
          min={16}
          max={64}
          step={16}
          marks={[
            { value: 16, label: '16' },
            { value: 32, label: '32' },
            { value: 48, label: '48' },
            { value: 64, label: '64' },
          ]}
          sx={isMobile ? mobileSliderSx : sliderSx}
        />
      </Box>

      <Box className="control-panel-bayc-row">
        <Box sx={{ minWidth: 0, pr: 1 }}>
          <Typography sx={{ fontSize: isMobile ? '1rem' : '0.9rem', color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
            Show original Bored Apes
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: '0.8rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.35 }}>
            Use the original ape pictures instead of Ape Facing Ape art.
          </Typography>
        </Box>
        <Switch
          checked={showBayc}
          onChange={(e) => onShowBayc(e.target.checked)}
          inputProps={{ 'aria-label': 'Show original Bored Apes' }}
          sx={isMobile ? mobileSwitchSx : switchSx}
        />
      </Box>

      <a className="sheet-editor" href={EDITOR_HOME} target="_blank" rel="noopener noreferrer">
        Open the editor
      </a>
      <LatestMints latestMints={latestMints} onMintClick={onMintClick} />
    </>
  );

  const renderCollapsedControls = ({ mobile = false } = {}) => (
    <div
      ref={toolsRef}
      className={`site-tools${mobile ? ' mobile' : ''}`}
    >
      <button
        type="button"
        className={`tool-button${shuffleEnabled ? ' active' : ''}`}
        onClick={onShuffleToggle}
        aria-pressed={shuffleEnabled}
      >
        <ShuffleIcon sx={{ fontSize: 16 }} />
        <span>Shuffle</span>
      </button>
      <button
        type="button"
        className={`tool-button${(mobile ? isExpanded : !isMinimized) ? ' active' : ''}`}
        onClick={mobile ? openMobilePanel : openDesktopPanel}
        aria-haspopup={mobile ? 'dialog' : undefined}
      >
        <TuneIcon sx={{ fontSize: 16 }} />
        <span>Controls{activeTraitCount > 0 ? ` (${activeTraitCount})` : ''}</span>
      </button>
    </div>
  );

  if (hidden) {
    return null;
  }

  const panelOpen = isMobile ? isExpanded : !isMinimized;

  return (
    <>
      {renderCollapsedControls({ mobile: isMobile })}
      {panelOpen && isMobile && (
        <Box
          className="control-panel-backdrop"
          onClick={closeMobilePanel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              closeMobilePanel();
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close controls"
        />
      )}
      {panelOpen && (
      <Paper
      className={`control-panel ${isMobile ? 'mobile' : 'desktop'}${docked ? ' docked' : ''}${isMobile ? ' expanded' : ''}${
        traitFilterExpanded ? ' trait-filter-expanded' : ''
      }`}
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
      aria-label={isMobile ? 'Controls' : undefined}
      elevation={0}
      sx={{
        position: docked ? 'relative' : 'fixed',
        top: isMobile ? 'auto' : 'calc(var(--site-header-offset, 108px) + 8px)',
        bottom: isMobile ? 'var(--site-tools-offset, 44px)' : 'auto',
        right: isMobile ? 0 : 8,
        left: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : 300,
        maxHeight: isMobile
          ? 'min(68dvh, 580px)'
          : 'calc(100vh - var(--site-header-offset, 108px) - var(--site-tools-offset, 44px) - 24px)',
        overflow: 'auto',
        bgcolor: 'rgba(16, 18, 22, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        zIndex: docked ? 'auto' : 1600,
        borderRadius: isMobile ? '16px 16px 0 0' : '16px',
        boxShadow: isMobile
          ? '0 -12px 40px rgba(0, 0, 0, 0.38)'
          : '0 18px 48px rgba(0, 0, 0, 0.4)',
        paddingBottom: 0,
      }}
    >
      <Box
        className="control-panel-inner"
        sx={{
          px: isMobile ? 1.5 : 1.75,
          pt: isMobile ? 0.5 : 1.5,
          pb: isMobile ? 1 : 1.5,
        }}
      >
        {isMobile && <Box className="control-panel-drag-handle" aria-hidden />}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            mb: isMobile ? 0.5 : 1.25,
            minHeight: isMobile ? 44 : 28,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <TuneIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              Controls
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 0.5, flexWrap: 'wrap' }}>
              {isMobile && (
                <>
                  <Box className="control-panel-badge">{zoom}px</Box>
                  {showBayc && <Box className="control-panel-badge accent">BAYC</Box>}
                </>
              )}
              {!isMobile && showBayc && (
                <Box className="control-panel-badge accent">BAYC</Box>
              )}
            </Box>
          </Box>

          {!isMobile ? (
            <IconButton
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize controls"
              sx={{
                color: 'rgba(255,255,255,0.4)',
                p: 0.5,
                width: 28,
                height: 28,
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
              size="small"
            >
              <ExpandLessIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <IconButton
              onClick={closeMobilePanel}
              aria-label="Close controls"
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                width: 44,
                height: 44,
                flexShrink: 0,
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 22 }} />
            </IconButton>
          )}
        </Box>

        <Box sx={{ pb: isMobile ? 0.5 : 0 }}>{panelContent}</Box>
      </Box>
    </Paper>
      )}
    </>
  );
};

export default ControlPanel;
