import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TuneIcon from '@mui/icons-material/Tune';
import TraitFilter from './TraitFilter';
import './ControlPanel.css';

const sectionLabelSx = {
  color: 'rgba(255,255,255,0.45)',
  mb: 0.75,
  fontSize: '0.65rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
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
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '9px',
    fontWeight: 500,
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
  '& .MuiSlider-markLabel': { fontSize: '9px', mt: 0.5 },
};

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#6ee7a0' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6ee7a0' },
  '& .MuiSwitch-track': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  '& .MuiSwitch-thumb': { backgroundColor: '#fff' },
};

const mobileSwitchSx = {
  ...switchSx,
  transform: 'scale(0.92)',
  mr: -0.25,
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
  docked = false,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [traitFilterExpanded, setTraitFilterExpanded] = useState(false);

  const activeTraitCount = Object.values(traitFilters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [isMobile]);

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
    setIsExpanded(true);
    onTraitFilterOpen?.();
  };
  const closeMobilePanel = () => setIsExpanded(false);

  const openDesktopPanel = () => {
    setIsMinimized(false);
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
      <Box sx={{ mb: isMobile ? 2 : 1.75 }} className="control-panel-trait-section">
        <TraitFilter
          catalog={traitCatalog}
          filters={traitFilters}
          onChange={onTraitFiltersChange}
          matchCount={filteredMatchCount}
          loading={traitCatalogLoading}
          isMobile={isMobile}
          onExpand={onTraitFilterOpen}
          onExpandedChange={setTraitFilterExpanded}
        />
      </Box>

      <Box
        sx={{
          mb: isMobile ? 2 : 2,
          pt: isMobile ? 1.5 : 1.25,
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

      <Box sx={{ mb: isMobile ? 2 : 1.75 }}>
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

      {isMobile ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 40,
            px: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <VisibilityIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.45)' }} />
            <Typography sx={{ fontSize: '0.8125rem', color: '#fff', fontWeight: 500 }}>
              Show Original BAYC
            </Typography>
          </Box>
          <Switch
            checked={showBayc}
            onChange={(e) => onShowBayc(e.target.checked)}
            sx={mobileSwitchSx}
          />
        </Box>
      ) : (
        <FormControlLabel
          control={
            <Switch
              checked={showBayc}
              onChange={(e) => onShowBayc(e.target.checked)}
              size="small"
              sx={switchSx}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <VisibilityIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.45)' }} />
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff' }}>
                Show Original BAYC
              </Typography>
            </Box>
          }
          sx={{ m: 0, color: '#fff' }}
        />
      )}
    </>
  );

  const mobileFabBadges =
    isMobile && !isExpanded ? (
      <Box className="control-panel-fab-badges" aria-hidden>
        {activeTraitCount > 0 && (
          <Box className="control-panel-fab-dot accent" title={`${activeTraitCount} trait filters`} />
        )}
        {showBayc && <Box className="control-panel-fab-dot" title="BAYC overlay on" />}
      </Box>
    ) : null;

  if (isMobile && !isExpanded && !hidden) {
    return (
      <Tooltip
        title={
          activeTraitCount > 0
            ? `Controls · ${activeTraitCount} trait filter${activeTraitCount === 1 ? '' : 's'}`
            : 'Open controls'
        }
        placement="left"
      >
        <IconButton
          className="control-panel-fab"
          onClick={openMobilePanel}
          aria-label="Open controls"
          aria-haspopup="dialog"
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
            zIndex: 1600,
            width: 52,
            height: 52,
            bgcolor: 'rgba(16, 18, 22, 0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '14px',
            color: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(24, 26, 30, 0.96)',
              color: '#fff',
              boxShadow: '0 6px 24px rgba(0,0,0,0.42)',
            },
            '&:active': {
              transform: 'scale(0.96)',
            },
          }}
        >
          <TuneIcon sx={{ fontSize: 22 }} />
          {mobileFabBadges}
        </IconButton>
      </Tooltip>
    );
  }

  if (!isMobile && isMinimized) {
    return (
      <Tooltip
        title={
          activeTraitCount > 0
            ? `Controls · ${filteredMatchCount ?? 0} apes match filters`
            : 'Open controls'
        }
        placement={docked ? 'top' : 'left'}
      >
        <IconButton
          className="control-panel-trigger"
          onClick={openDesktopPanel}
          aria-label="Open controls"
          sx={{
            ...(docked
              ? {}
              : {
                  position: 'fixed',
                  top: 14,
                  right: 14,
                  zIndex: 1600,
                }),
            width: docked ? 44 : 36,
            height: docked ? 44 : 36,
            bgcolor: 'rgba(16, 18, 22, 0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: docked ? '12px' : '10px',
            color: 'rgba(255,255,255,0.75)',
            boxShadow: docked
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.28)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(24, 26, 30, 0.96)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.16)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.42)',
            },
          }}
        >
          <TuneIcon sx={{ fontSize: docked ? 22 : 18 }} />
          {activeTraitCount > 0 && (
            <Box className="control-panel-trigger-badge" aria-hidden>
              {activeTraitCount > 9 ? '9+' : activeTraitCount}
            </Box>
          )}
        </IconButton>
      </Tooltip>
    );
  }

  if (isMobile && hidden) {
    return null;
  }

  return (
    <>
      {isMobile && isExpanded && (
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
      <Paper
      className={`control-panel ${isMobile ? 'mobile' : 'desktop'}${docked ? ' docked' : ''}${isMobile ? ' expanded' : ''}${
        traitFilterExpanded ? ' trait-filter-expanded' : ''
      }${hidden ? ' hidden-for-modal' : ''}`}
      role={isMobile ? 'dialog' : undefined}
      aria-modal={isMobile ? true : undefined}
      aria-label={isMobile ? 'Controls' : undefined}
      elevation={0}
      sx={{
        position: docked ? 'relative' : 'fixed',
        top: isMobile ? 'auto' : docked ? 'auto' : 14,
        bottom: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : docked ? 'auto' : 14,
        left: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : docked ? 280 : 300,
        maxHeight: isMobile
          ? traitFilterExpanded
            ? 'min(78dvh, 560px)'
            : 'min(52dvh, 380px)'
          : docked
            ? 'min(420px, calc(100vh - 40px))'
            : 'calc(100vh - 28px)',
        overflow: 'auto',
        bgcolor: 'rgba(16, 18, 22, 0.92)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : undefined,
        zIndex: docked ? 'auto' : 1600,
        transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s ease',
        borderRadius: isMobile ? '16px 16px 0 0' : '14px',
        boxShadow: isMobile
          ? '0 -4px 24px rgba(0, 0, 0, 0.35)'
          : docked
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 4px 24px rgba(0, 0, 0, 0.32)',
        paddingBottom: isMobile ? 'max(8px, env(safe-area-inset-bottom))' : 0,
      }}
    >
      <Box
        className="control-panel-inner"
        sx={{
          px: isMobile ? 1.5 : 1.75,
          pt: isMobile ? 0.5 : 1.5,
          pb: isMobile ? 0.75 : 1.5,
        }}
      >
        {isMobile && <Box className="control-panel-drag-handle" aria-hidden />}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            mb: 1.25,
            minHeight: isMobile ? 40 : 28,
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
              {activeTraitCount > 0 && (
                <Box className="control-panel-badge accent" title="Filtered ape count">
                  {filteredMatchCount ?? 0} match
                </Box>
              )}
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
                width: 40,
                height: 40,
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
    </>
  );
};

export default ControlPanel;
