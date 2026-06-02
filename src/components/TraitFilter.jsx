import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  Skeleton,
  Fade,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import './TraitFilter.css';

const TOTAL_APES = 10000;

const TRAIT_TYPE_SHORT = {
  Background: 'Bg',
  Fur: 'Fur',
  Clothes: 'Fit',
  Eyes: 'Eyes',
  Hat: 'Hat',
  Mouth: 'Mouth',
  Earring: 'Ear',
};

const formatMatchLabel = (matchCount, activeFilterCount) => {
  if (activeFilterCount === 0) {
    return `Browse all ${TOTAL_APES.toLocaleString()} apes`;
  }
  const n = matchCount ?? 0;
  return `${n.toLocaleString()} ${n === 1 ? 'ape' : 'apes'} match`;
};

/** Mint % among filtered matches only (not vs. 10k collection). */
const formatFilterMintLabel = (matchCount, mintedCount) => {
  if (matchCount == null || mintedCount == null || matchCount <= 0) return null;
  const pct = ((mintedCount / matchCount) * 100).toFixed(matchCount >= 1000 ? 1 : 2);
  return `${pct}% minted AFA`;
};

const TraitFilter = ({
  catalog,
  filters,
  onChange,
  matchCount,
  mintedCount = null,
  mintDataLoading = false,
  loading = false,
  isMobile = false,
  onExpand,
  onExpandedChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [valueSearch, setValueSearch] = useState('');

  const activeFilterCount = useMemo(
    () => Object.values(filters).reduce((sum, values) => sum + (values?.length ?? 0), 0),
    [filters]
  );

  const mintPercentLabel = useMemo(() => {
    if (activeFilterCount === 0 || mintDataLoading) return null;
    return formatFilterMintLabel(matchCount, mintedCount);
  }, [activeFilterCount, mintDataLoading, matchCount, mintedCount]);

  const activeTypeValues = useMemo(() => {
    if (!catalog || !activeType) return [];
    return catalog.find((entry) => entry.traitType === activeType)?.values ?? [];
  }, [catalog, activeType]);

  const filteredTypeValues = useMemo(() => {
    const query = valueSearch.trim().toLowerCase();
    if (!query) return activeTypeValues;
    return activeTypeValues.filter(({ value }) => value.toLowerCase().includes(query));
  }, [activeTypeValues, valueSearch]);

  useEffect(() => {
    if (activeFilterCount > 0) setExpanded(true);
  }, [activeFilterCount]);

  useEffect(() => {
    if (!catalog?.length) return;
    if (activeType && catalog.some((entry) => entry.traitType === activeType)) return;
    const firstWithSelection = catalog.find(
      (entry) => (filters[entry.traitType]?.length ?? 0) > 0
    );
    setActiveType(firstWithSelection?.traitType ?? catalog[0].traitType);
  }, [catalog, activeType, filters]);

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    setValueSearch('');
  }, [activeType]);

  const setExpandedState = (next) => {
    if (next && !expanded) onExpand?.();
    setExpanded(next);
    if (next && catalog?.length && !activeType) {
      setActiveType(catalog[0].traitType);
    }
  };

  const handleToggleHeader = () => {
    setExpandedState(!expanded);
  };

  const handleToggleValue = (traitType, value) => {
    const current = filters[traitType] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onChange({
      ...filters,
      [traitType]: next,
    });
  };

  const handleClearAll = (e) => {
    e?.stopPropagation?.();
    onChange({});
    setActiveType(catalog?.[0]?.traitType ?? null);
    setValueSearch('');
  };

  const shortType = (traitType) => TRAIT_TYPE_SHORT[traitType] ?? traitType;

  return (
    <Box
      className={`trait-filter trait-filter-card${activeFilterCount > 0 ? ' is-active' : ''}${
        expanded ? ' is-expanded' : ''
      }`}
    >
      <button
        type="button"
        className="trait-filter-header"
        onClick={handleToggleHeader}
        aria-expanded={expanded}
        aria-controls="trait-filter-panel"
      >
        <Box className="trait-filter-icon-wrap" aria-hidden>
          <FilterListIcon sx={{ fontSize: isMobile ? 20 : 17 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontSize: isMobile ? '0.9375rem' : '0.8125rem',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
            }}
          >
            Filter by traits
          </Typography>
          <Typography
            component="span"
            sx={{
              display: 'block',
              mt: 0.25,
              fontSize: isMobile ? '0.75rem' : '0.6875rem',
              color: activeFilterCount > 0 ? '#6ee7a0' : 'rgba(255,255,255,0.45)',
              fontWeight: activeFilterCount > 0 ? 600 : 400,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMatchLabel(matchCount, activeFilterCount)}
            {activeFilterCount > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                }}
              >
                · {activeFilterCount} selected
              </Box>
            )}
          </Typography>
          {mintPercentLabel && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                mt: 0.125,
                fontSize: isMobile ? '0.6875rem' : '0.625rem',
                color: 'rgba(255,255,255,0.32)',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.3,
              }}
            >
              {mintPercentLabel}
            </Typography>
          )}
        </Box>

        <ExpandMoreIcon
          sx={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.45)',
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s ease',
          }}
          aria-hidden
        />
      </button>

      {activeFilterCount > 0 && !expanded && (
        <Fade in>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.625,
              px: 1.25,
              pb: 1.25,
              pt: 0,
            }}
          >
            {Object.entries(filters).flatMap(([traitType, values]) =>
              values.map((value) => (
                <Box key={`${traitType}-${value}`} className="trait-filter-active-chip">
                  <span className="trait-filter-active-chip-type">{shortType(traitType)}</span>
                  <span>{value}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleValue(traitType, value)}
                    aria-label={`Remove ${traitType}: ${value}`}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </button>
                </Box>
              ))
            )}
            <Button
              size="small"
              onClick={handleClearAll}
              sx={{
                minHeight: isMobile ? 36 : 28,
                px: 1.25,
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'none',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              Clear all
            </Button>
          </Box>
        </Fade>
      )}

      <Collapse in={expanded} timeout={260}>
        <Box id="trait-filter-panel" sx={{ px: 1.25, pb: 1.25, pt: 0 }}>
          <Typography
            sx={{
              mb: 1,
              fontSize: '0.625rem',
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.38)',
            }}
          >
            Match any trait within a category · All selected categories must match
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Skeleton variant="rounded" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Skeleton variant="rounded" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Skeleton variant="rounded" height={100} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
            </Box>
          )}

          {!loading && catalog && (
            <>
              <Box className="trait-filter-types" role="tablist" aria-label="Trait categories">
                {catalog.map(({ traitType }) => {
                  const selectedCount = filters[traitType]?.length ?? 0;
                  const isActive = activeType === traitType;
                  return (
                    <button
                      key={traitType}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`trait-filter-type-btn${isActive ? ' is-active' : ''}`}
                      onClick={() => setActiveType(traitType)}
                    >
                      {traitType}
                      {selectedCount > 0 && (
                        <span className="trait-filter-type-count">{selectedCount}</span>
                      )}
                    </button>
                  );
                })}
              </Box>

              <TextField
                fullWidth
                size="small"
                placeholder={`Search ${activeType ?? 'traits'}…`}
                value={valueSearch}
                onChange={(e) => setValueSearch(e.target.value)}
                sx={{
                  mt: 1,
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    fontSize: isMobile ? '16px' : '0.8125rem',
                    color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.2)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#6ee7a0',
                      borderWidth: 1,
                    },
                  },
                  '& .MuiInputBase-input': {
                    py: isMobile ? 1.125 : 0.75,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: valueSearch ? (
                    <InputAdornment position="end">
                      <button
                        type="button"
                        onClick={() => setValueSearch('')}
                        aria-label="Clear search"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'rgba(255,255,255,0.45)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </button>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Box
                className={`trait-filter-values ${isMobile ? 'mobile' : 'desktop'}`}
                role="group"
                aria-label={`${activeType} values`}
              >
                {filteredTypeValues.length === 0 && valueSearch.trim() && (
                  <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', py: 1 }}>
                    No traits match &ldquo;{valueSearch.trim()}&rdquo;
                  </Typography>
                )}
                {filteredTypeValues.map(({ value, count }) => {
                  const selected = filters[activeType]?.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`trait-filter-value-btn${selected ? ' is-selected' : ''}`}
                      onClick={() => handleToggleValue(activeType, value)}
                      aria-pressed={selected}
                    >
                      {value}
                      <span className="trait-filter-value-count">({count})</span>
                    </button>
                  );
                })}
              </Box>

              {activeFilterCount > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 1.25,
                    pt: 1,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Button
                    size="small"
                    onClick={handleClearAll}
                    sx={{
                      flexShrink: 0,
                      minHeight: isMobile ? 36 : 28,
                      px: 1.25,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.55)',
                      textTransform: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      '&:hover': {
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.06)',
                        borderColor: 'rgba(255,255,255,0.18)',
                      },
                    }}
                  >
                    Clear all
                  </Button>
                </Box>
              )}
            </>
          )}

          {!loading && !catalog && (
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', py: 0.5 }}>
              Open to load BAYC trait data
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default TraitFilter;
