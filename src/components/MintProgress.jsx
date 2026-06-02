import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, TrendingUp } from '@mui/icons-material';
import Draggable from 'react-draggable';
import './MintProgress.css';
import { setAfaIpfsImageSrc, tryNextAfaIpfsGateway } from '../utils/imageUrls';

const MintProgress = ({ mintedCount, latestMints, fetchError, mintDataLoading, hidden = false, onMintClick, docked = false }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '/');
  };

  const mintPercent = ((mintedCount / 10000) * 100).toFixed(mintedCount >= 1000 ? 1 : 2);

  const content = (
    <Box className={`mint-progress ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : 'desktop'}${docked ? ' docked' : ''}${hidden ? ' hidden-for-modal' : ''}`}>
      <Box
        className={`drag-handle${docked ? ' dock-drag-handle' : ''}`}
        component={isMobile ? 'button' : 'div'}
        type={isMobile ? 'button' : undefined}
        onClick={isMobile ? () => setIsCollapsed(!isCollapsed) : undefined}
        sx={{
          border: 'none',
          background: 'transparent',
          width: '100%',
          padding: 0,
          textAlign: 'left',
          cursor: isMobile ? 'pointer' : 'move',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: isMobile ? 36 : 'auto',
          py: isMobile ? 0 : 0,
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 1 : 1,
            flex: 1,
            minWidth: 0,
          }}>
            <TrendingUp sx={{
              color: '#6ee7a0',
              fontSize: isMobile ? '17px' : '18px',
              flexShrink: 0,
            }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: isMobile ? '0.8125rem' : '15px',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 0,
                  }}
                >
                  {mintDataLoading && mintedCount === 0
                    ? 'Syncing mint data…'
                    : `${mintedCount.toLocaleString()} / 10,000`}
                  {mintDataLoading && mintedCount > 0 && (
                    <Box
                      component="span"
                      sx={{ ml: 0.75, color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}
                    >
                      · updating
                    </Box>
                  )}
                </Typography>
                {!mintDataLoading || mintedCount > 0 ? (
                  <Typography
                    sx={{
                      color: '#6ee7a0',
                      fontSize: isMobile ? '0.75rem' : '13px',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    {mintPercent}%
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{
                mt: isMobile ? 0.5 : 0.75,
                height: isMobile ? 3 : 4,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <Box sx={{
                  height: '100%',
                  width: `${(mintedCount / 10000) * 100}%`,
                  bgcolor: '#6ee7a0',
                  borderRadius: 2,
                  transition: 'width 0.6s ease',
                  boxShadow: '0 0 8px rgba(110, 231, 160, 0.35)',
                }} />
              </Box>
              {fetchError && (
                <Typography sx={{ mt: 0.75, fontSize: '11px', color: '#f87171', lineHeight: 1.3 }}>
                  {fetchError}
                </Typography>
              )}
            </Box>
          </Box>

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            size="small"
            sx={{
              color: 'rgba(255,255,255,0.45)',
              minWidth: isMobile ? 32 : 'auto',
              minHeight: isMobile ? 32 : 'auto',
              p: isMobile ? 0.5 : undefined,
              borderRadius: 1.5,
              flexShrink: 0,
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            {isCollapsed
              ? <ExpandMore sx={{ fontSize: isMobile ? '20px' : '20px' }} />
              : <ExpandLess sx={{ fontSize: isMobile ? '20px' : '20px' }} />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={!isCollapsed} timeout={260}>
        <Box sx={{ mt: isMobile ? 1.5 : 2, pb: isMobile ? 0.25 : 0 }}>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.45)',
              mb: isMobile ? 1.25 : 1,
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Latest Mints
          </Typography>
          
          <Box className="latest-mints-list">
          {latestMints.map((mint) => (
              <Box
                key={mint.tokenId}
                className="mint-entry"
                component="button"
                type="button"
                onClick={() => onMintClick?.(mint.tokenId)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? 1.5 : 1.5,
                  p: isMobile ? 1.25 : 0.75,
                  borderRadius: isMobile ? 1.5 : 1,
                  transition: 'background 0.2s ease',
                  minHeight: isMobile ? 56 : 'auto',
                  width: '100%',
                  mb: isMobile ? 2 : 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  color: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                  '&:last-child': {
                    mb: 0,
                  },
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    transform: isMobile ? 'none' : 'translateY(-1px)',
                  },
                  '&:active': {
                    transform: isMobile ? 'scale(0.99)' : 'none',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={`/images/${mint.tokenId}.webp`}
                  alt={`AFA #${mint.tokenId}`}
                  sx={{
                    width: isMobile ? 44 : 36,
                    height: isMobile ? 44 : 36,
                    borderRadius: isMobile ? '8px' : '6px',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onError={async (e) => {
                    const img = e.target;
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
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      mb: isMobile ? 0.25 : 0,
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#fff',
                        fontSize: isMobile ? '0.875rem' : '14px',
                        fontWeight: 600,
                        lineHeight: 1.3,
                      }}
                    >
                      #{mint.tokenId}
                    </Typography>
                    {mint.isTransfer && (
                      <Box
                        component="span"
                        sx={{
                          color: '#ffb74d',
                          fontSize: isMobile ? '0.625rem' : '10px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                          px: 0.625,
                          py: 0.25,
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 183, 77, 0.45)',
                          bgcolor: 'rgba(255, 183, 77, 0.12)',
                        }}
                      >
                        Transfer
                      </Box>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: isMobile ? '0.75rem' : '12px',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatDate(mint.timestamp)}
                  </Typography>
                </Box>
              </Box>
          ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );

  if (docked || isMobile) return content;

  return (
    <Draggable handle=".drag-handle" cancel=".latest-mints-list, .mint-entry">
      {content}
    </Draggable>
  );
};

export default MintProgress;
