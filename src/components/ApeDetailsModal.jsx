import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  Box,
  Typography,
  Card,
  CardMedia,
  IconButton,
  Button,
  Chip,
  Skeleton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import { getBaycMetadata, getBaycMetadataAsync } from '../data/baycMetadata';
import {
  getAfaThumbnailFallbackUrl,
  getBaycThumbnailFallbackUrl,
  getAfaLocalHiresUrl,
  getAfaServerHiresUrl,
  hasLocalHires,
  isLocalHiresSrc,
  ipfsToHttpUrl,
  resolveIpfsUrl,
} from '../utils/imageUrls';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: 'calc(100% - 16px)', md: '90%' },
  maxWidth: '920px',
  maxHeight: {
    xs: 'calc(100dvh - max(12px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)))',
    md: '90vh',
  },
  bgcolor: '#1E1E1E',
  borderRadius: { xs: '14px', md: '16px' },
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden',
  p: 0,
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
};

const cardStyle = {
  background: 'transparent',
  boxShadow: 'none',
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  flex: 1,
  minHeight: 0,
  maxHeight: '100%',
  overflow: 'hidden',
  WebkitOverflowScrolling: 'touch',
};

const SWIPE_THRESHOLD_PX = 48;

const HIRES_LOADING_MESSAGES = [
  { title: 'Polishing pixels…', subtitle: 'Full resolution dropping soon' },
  { title: 'Summoning the hi-res ape…', subtitle: 'IPFS monkeys are en route' },
  { title: 'Cranking up the detail…', subtitle: 'Almost sharp enough to count the fur' },
  { title: 'Un-blurring the masterpiece…', subtitle: 'Your mint deserves the big picture' },
  { title: 'Fetching from the jungle…', subtitle: 'High-res is swinging in any second' },
  { title: 'Loading the good stuff…', subtitle: 'Patience — beauty takes bandwidth' },
  { title: 'Waking up the pixels…', subtitle: 'Hi-res reveal incoming' },
  { title: 'Consulting the banana oracle…', subtitle: 'Crystal-clear version on the way' },
];

const pickHiresLoadingMessage = () =>
  HIRES_LOADING_MESSAGES[Math.floor(Math.random() * HIRES_LOADING_MESSAGES.length)];

const MIN_HIRES_DIMENSION = 256;
const HIRES_BLUR_TIMEOUT_MS = 6000;

const isValidHiresImage = (img) =>
  img.naturalWidth >= MIN_HIRES_DIMENSION && img.naturalHeight >= MIN_HIRES_DIMENSION;

const ImageStatusOverlay = ({ title, subtitle, isMobile }) => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      px: 3,
      textAlign: 'center',
      background: 'rgba(0, 0, 0, 0.55)',
      pointerEvents: 'none',
      zIndex: 1,
    }}
  >
    <Typography
      variant={isMobile ? 'body1' : 'h5'}
      sx={{
        color: '#fff',
        fontWeight: 700,
        fontSize: isMobile ? '1rem' : undefined,
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}
    >
      {title}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: isMobile ? '0.75rem' : undefined,
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}
    >
      {subtitle}
    </Typography>
  </Box>
);

const imageContainerStyle = {
  flexShrink: 0,
  width: { xs: '100%', md: 'min(52vw, calc(90vh - 32px))' },
  maxWidth: { md: '480px' },
  aspectRatio: '1',
  position: 'relative',
  backgroundColor: '#000',
  overflow: 'hidden',
  touchAction: { xs: 'none', md: 'auto' },
};

const imageStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: { xs: 'contain', md: 'cover' },
  display: 'block',
};

const infoBoxStyle = {
  bgcolor: '#363636',
  borderRadius: 1.5,
  px: 1.5,
  py: 1,
};

const contentStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  bgcolor: '#2A2A2A',
  p: { xs: 1.25, md: 3 },
  display: 'flex',
  flexDirection: 'column',
  gap: { xs: 0.75, md: 2 },
  overflowY: { xs: 'hidden', md: 'auto' },
};

const mobileInfoBoxStyle = {
  bgcolor: '#363636',
  borderRadius: 1,
  px: 1,
  py: 0.625,
};

const arrowButtonStyle = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  bgcolor: 'rgba(0,0,0,0.3)',
  color: 'white',
  width: { xs: 40, md: 'auto' },
  height: { xs: 40, md: 'auto' },
  '&:hover': {
    bgcolor: 'rgba(0,0,0,0.5)',
  },
  '&.Mui-disabled': {
    display: 'none',
  },
};

const ApeDetailsModal = ({ open, onClose, apeData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(0);
  const [baycMetadata, setBaycMetadata] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [afaImageUrl, setAfaImageUrl] = useState(null);
  const [afaHiresUrl, setAfaHiresUrl] = useState(null);
  const [afaHiresReady, setAfaHiresReady] = useState(false);
  const [baycImageUrl, setBaycImageUrl] = useState(null);
  const [imageReady, setImageReady] = useState(false);
  const [afaHighResLoading, setAfaHighResLoading] = useState(false);
  const [hiresLoadingMessage, setHiresLoadingMessage] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipeLocked = useRef(null);
  const dragOffsetRef = useRef(0);
  const afaHiresTimerRef = useRef(null);
  const currentTokenRef = useRef(null);
  const maxSteps = 2;

  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open, apeData?.tokenId]);

  const clearAfaHighResLoading = useCallback(() => {
    setAfaHighResLoading(false);
    setHiresLoadingMessage(null);
  }, []);

  useEffect(() => {
    if (afaHiresTimerRef.current) {
      clearTimeout(afaHiresTimerRef.current);
      afaHiresTimerRef.current = null;
    }
    if (!open || !apeData) {
      currentTokenRef.current = null;
      setBaycMetadata(null);
      setAfaImageUrl(null);
      setAfaHiresUrl(null);
      setAfaHiresReady(false);
      setBaycImageUrl(null);
      setImageReady(false);
      setMetadataLoading(false);
      setAfaHighResLoading(false);
      setHiresLoadingMessage(null);
      return undefined;
    }

    let cancelled = false;
    const { tokenId, image, baycImage, isMinted } = apeData;
    currentTokenRef.current = tokenId;

    setAfaImageUrl(image);
    setAfaHiresUrl(null);
    setAfaHiresReady(false);
    setBaycImageUrl(baycImage);
    setImageReady(true);
    setBaycMetadata(null);
    setMetadataLoading(true);
    setAfaHighResLoading(isMinted);
    setHiresLoadingMessage(isMinted ? pickHiresLoadingMessage() : null);

    const loadMetadata = async () => {
      const cachedMetadata = getBaycMetadata(tokenId);
      const metadata = cachedMetadata ?? await getBaycMetadataAsync(tokenId);

      if (cancelled) return;

      setBaycMetadata(metadata);
      setMetadataLoading(false);

      // Full-resolution original via Alchemy's NFT CDN (server-side key); public IPFS gateways as fallback.
      const fullRes = `/api/bayc-image?tokenId=${tokenId}`;
      const fullResOk = await new Promise((resolve) => {
        const probe = new Image();
        const timer = setTimeout(() => resolve(false), 12000);
        probe.onload = () => { clearTimeout(timer); resolve(probe.naturalWidth >= MIN_HIRES_DIMENSION); };
        probe.onerror = () => { clearTimeout(timer); resolve(false); };
        probe.src = fullRes;
      });
      if (cancelled) return;
      if (fullResOk) {
        setBaycImageUrl(fullRes);
        return;
      }

      const baycCid = metadata?.image?.startsWith('ipfs://') ? metadata.image.slice(7) : null;
      if (!baycCid) return;

      const baycHighRes = await resolveIpfsUrl(baycCid);
      if (!cancelled && baycHighRes) setBaycImageUrl(baycHighRes);
    };

    const loadAfaHighRes = async () => {
      // Never keep a minted ape blurred: after the timeout show the thumbnail sharp,
      // the hi-res still fades in when it arrives.
      afaHiresTimerRef.current = window.setTimeout(clearAfaHighResLoading, HIRES_BLUR_TIMEOUT_MS);
      const local = await hasLocalHires(tokenId);
      if (cancelled) return;
      setAfaHiresUrl(local ? getAfaLocalHiresUrl(tokenId) : getAfaServerHiresUrl(tokenId));
    };

    loadMetadata();
    if (isMinted) loadAfaHighRes();

    return () => {
      cancelled = true;
      if (afaHiresTimerRef.current) {
        clearTimeout(afaHiresTimerRef.current);
        afaHiresTimerRef.current = null;
      }
    };
  }, [open, apeData, clearAfaHighResLoading]);

  const handleNext = useCallback(() => {
    setActiveStep((prevStep) => Math.min(prevStep + 1, maxSteps - 1));
  }, [maxSteps]);

  const handleBack = useCallback(() => {
    setActiveStep((prevStep) => Math.max(prevStep - 1, 0));
  }, []);

  const handleTouchStart = useCallback((event) => {
    if (!isMobile) return;
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
    swipeLocked.current = null;
    setIsDragging(true);
    setDragOffset(0);
    dragOffsetRef.current = 0;
  }, [isMobile]);

  const handleTouchMove = useCallback((event) => {
    if (!isMobile || touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = event.touches[0].clientX - touchStartX.current;
    const deltaY = event.touches[0].clientY - touchStartY.current;

    if (swipeLocked.current === null) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      swipeLocked.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (swipeLocked.current !== 'horizontal') return;

    event.preventDefault();
    dragOffsetRef.current = deltaX;
    setDragOffset(deltaX);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;

    if (swipeLocked.current === 'horizontal') {
      const offset = dragOffsetRef.current;
      if (offset <= -SWIPE_THRESHOLD_PX && activeStep < maxSteps - 1) {
        handleNext();
      } else if (offset >= SWIPE_THRESHOLD_PX && activeStep > 0) {
        handleBack();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    swipeLocked.current = null;
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffset(0);
  }, [isMobile, activeStep, maxSteps, handleNext, handleBack]);

  const isStaleEvent = (img) => {
    const tokenId = currentTokenRef.current;
    const src = img.currentSrc || img.src || '';
    return tokenId == null
      || !(src.includes(`/hires/${tokenId}.webp`) || src.includes(`tokenId=${tokenId}`));
  };

  const handleHiresImageLoad = useCallback((event) => {
    if (!apeData?.isMinted || isStaleEvent(event.currentTarget)) return;
    if (!isValidHiresImage(event.currentTarget)) {
      clearAfaHighResLoading();
      return;
    }
    if (afaHiresTimerRef.current) clearTimeout(afaHiresTimerRef.current);
    setAfaHiresReady(true);
    clearAfaHighResLoading();
  }, [apeData, clearAfaHighResLoading]);

  const handleHiresImageError = useCallback((event) => {
    if (!apeData?.isMinted || isStaleEvent(event.currentTarget)) return;
    const src = event.currentTarget.currentSrc || event.currentTarget.src;
    if (isLocalHiresSrc(src)) {
      setAfaHiresUrl(getAfaServerHiresUrl(apeData.tokenId));
      return;
    }
    setAfaHiresUrl(null);
    setAfaHiresReady(false);
    clearAfaHighResLoading();
  }, [apeData, clearAfaHighResLoading]);

  const handleImageError = useCallback(async (stepIndex, event) => {
    if (!apeData) return;

    const img = event.target;
    const stage = img.dataset.fallbackStage || 'webp';

    if (stepIndex === 0) {
      if (stage === 'webp') {
        img.dataset.fallbackStage = 'png';
        setAfaImageUrl(getAfaThumbnailFallbackUrl(apeData.tokenId));
      }
      return;
    }

    if (stage === 'webp') {
      img.dataset.fallbackStage = 'png';
      img.src = getBaycThumbnailFallbackUrl(apeData.tokenId);
      return;
    }

    if (img.dataset.fallbackStage === 'bayc-done') return;
    img.dataset.fallbackStage = 'bayc-done';

    const metadata = baycMetadata ?? await getBaycMetadataAsync(apeData.tokenId);
    const baycHighRes = ipfsToHttpUrl(metadata?.image);
    if (baycHighRes) img.src = baycHighRes;
  }, [apeData, baycMetadata]);

  if (!apeData) return null;

  const images = [
    { title: 'AFA Version', url: afaImageUrl },
    { title: 'Original BAYC', url: baycImageUrl },
  ];
  const currentImage = images[activeStep];
  const slideOffset = isMobile && isDragging ? dragOffset : 0;
  const slideTransform = `calc(-${activeStep * (100 / maxSteps)}% + ${slideOffset}px)`;

  const renderSlide = (image, stepIndex) => {
    const showUnminted = stepIndex === 0 && !apeData.isMinted;
    const isAfaSlide = stepIndex === 0;
    const showHiresLoading = isAfaSlide && apeData.isMinted && afaHighResLoading && !afaHiresReady;
    const showBlur = showUnminted || showHiresLoading;

    const blurStyle = showBlur
      ? { filter: 'blur(20px)', transform: isMobile ? 'none' : 'scale(1.08)' }
      : {};

    return (
      <Box
        key={image.title}
        sx={{
          flex: `0 0 ${100 / maxSteps}%`,
          width: `${100 / maxSteps}%`,
          height: '100%',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {image.url && (
          <>
            <CardMedia
              component="img"
              key={`${stepIndex}-base-${image.url}`}
              image={image.url}
              alt={`${image.title} #${apeData.tokenId}`}
              onError={(event) => handleImageError(stepIndex, event)}
              sx={{
                ...imageStyle,
                opacity: imageReady ? 1 : 0,
                transition: 'filter 0.45s ease, transform 0.45s ease, opacity 0.2s ease',
                ...blurStyle,
              }}
            />
            {isAfaSlide && apeData.isMinted && afaHiresUrl && (
              <CardMedia
                component="img"
                key={`${stepIndex}-hires-${afaHiresUrl}`}
                image={afaHiresUrl}
                alt={`${image.title} #${apeData.tokenId} hi-res`}
                onLoad={handleHiresImageLoad}
                onError={handleHiresImageError}
                sx={{
                  ...imageStyle,
                  opacity: afaHiresReady ? 1 : 0,
                  transition: 'opacity 0.35s ease',
                  pointerEvents: 'none',
                }}
              />
            )}
          </>
        )}
        {(showBlur || showHiresLoading) && (
          <ImageStatusOverlay
            isMobile={isMobile}
            title={showHiresLoading ? hiresLoadingMessage?.title : 'Not yet minted'}
            subtitle={
              showHiresLoading
                ? hiresLoadingMessage?.subtitle
                : 'Mint your AFA to reveal the full artwork'
            }
          />
        )}
      </Box>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      sx={{ zIndex: 1700 }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        },
      }}
    >
      <Box sx={style}>
        <IconButton
          onClick={onClose}
          aria-label="Close details"
          sx={{
            position: 'absolute',
            right: { xs: 6, md: 8 },
            top: { xs: 6, md: 8 },
            color: 'white',
            zIndex: 2,
            width: { xs: 40, md: 'auto' },
            height: { xs: 40, md: 'auto' },
            bgcolor: 'rgba(0,0,0,0.55)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Card sx={cardStyle}>
          <Box
            sx={imageContainerStyle}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {!imageReady && (
              <Skeleton
                variant="rectangular"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  zIndex: 0,
                }}
              />
            )}

            <Box
              sx={{
                display: 'flex',
                width: `${maxSteps * 100}%`,
                height: '100%',
                transform: `translateX(${slideTransform})`,
                transition: isMobile && isDragging
                  ? 'none'
                  : 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
              }}
            >
              {images.map((image, stepIndex) => renderSlide(image, stepIndex))}
            </Box>

            <Typography
              variant="h6"
              sx={{
                color: 'white',
                position: 'absolute',
                top: { xs: 12, md: 16 },
                left: { xs: 12, md: 16 },
                fontSize: { xs: '0.875rem', md: '1.25rem' },
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                zIndex: 1,
                pointerEvents: 'none',
              }}
            >
              {currentImage.title}
            </Typography>

            {isMobile ? (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 0.75,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                {images.map((image, stepIndex) => (
                  <Box
                    key={image.title}
                    sx={{
                      width: stepIndex === activeStep ? 16 : 6,
                      height: 6,
                      borderRadius: 999,
                      bgcolor: stepIndex === activeStep ? '#6ee7a0' : 'rgba(255,255,255,0.35)',
                      transition: 'width 0.2s ease, background-color 0.2s ease',
                    }}
                  />
                ))}
              </Box>
            ) : (
              <>
                <IconButton
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  sx={{
                    ...arrowButtonStyle,
                    left: 16,
                  }}
                >
                  <KeyboardArrowLeft />
                </IconButton>
                <IconButton
                  onClick={handleNext}
                  disabled={activeStep === maxSteps - 1}
                  sx={{
                    ...arrowButtonStyle,
                    right: 16,
                  }}
                >
                  <KeyboardArrowRight />
                </IconButton>
              </>
            )}
          </Box>

          <Box sx={contentStyle}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#fff',
                  fontSize: { xs: '1rem', md: '1.5rem' },
                }}
              >
                AFA #{apeData.tokenId}
              </Typography>

              {apeData.isMinted ? (
                <Chip
                  label="Minted"
                  size="small"
                  sx={{
                    bgcolor: '#6ee7a0',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    height: 22,
                  }}
                />
              ) : (
                <Chip
                  label="Not Minted"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 183, 77, 0.2)',
                    color: '#ffb74d',
                    border: '1px solid rgba(255, 183, 77, 0.4)',
                    fontWeight: 600,
                    fontSize: '0.6875rem',
                    height: 22,
                  }}
                />
              )}

              {isMobile && apeData.isMinted && apeData.mintDate && (
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.6875rem',
                    fontVariantNumeric: 'tabular-nums',
                    ml: 'auto',
                  }}
                >
                  {new Date(apeData.mintDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Typography>
              )}
            </Box>

            {!isMobile && apeData.isMinted && apeData.mintDate && (
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#999',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  <CalendarTodayIcon fontSize="small" />
                  Minted on
                </Typography>
                <Box sx={infoBoxStyle}>
                  <Typography sx={{ color: '#fff' }}>
                    {new Date(apeData.mintDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ flexShrink: 0 }}>
              {!isMobile && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: '#999',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  <AccountBalanceWalletIcon fontSize="small" />
                  {apeData.isMinted ? 'Owner' : 'Original Owner'}
                </Typography>
              )}
              <Box sx={isMobile ? mobileInfoBoxStyle : infoBoxStyle}>
                {apeData.ensName && (
                  <Typography
                    sx={{
                      color: '#fff',
                      mb: isMobile ? 0.25 : 1,
                      fontWeight: 500,
                      fontSize: isMobile ? '0.75rem' : '1rem',
                    }}
                    noWrap={isMobile}
                  >
                    {apeData.ensName}
                  </Typography>
                )}
                <Typography
                  noWrap={isMobile}
                  sx={{
                    color: apeData.ensName ? '#999' : '#fff',
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '0.6875rem' : '0.875rem',
                    wordBreak: isMobile ? 'normal' : 'break-all',
                  }}
                >
                  {apeData.owner || 'N/A'}
                </Typography>
              </Box>
            </Box>

            {metadataLoading && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
                {Array.from({ length: isMobile ? 4 : 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    variant="rounded"
                    height={isMobile ? 28 : 40}
                    sx={{ bgcolor: 'rgba(255,255,255,0.06)' }}
                  />
                ))}
              </Box>
            )}

            {!metadataLoading && baycMetadata?.attributes && (
              <Box sx={{ flex: isMobile ? 1 : 'initial', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {!isMobile && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#888',
                      mb: 0.75,
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Attributes
                  </Typography>
                )}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: isMobile ? 0.375 : 0.5,
                  maxHeight: { xs: 'none', md: 140 },
                  overflowY: { xs: 'hidden', md: 'auto' },
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'rgba(255,255,255,0.2)',
                    borderRadius: 2,
                  },
                }}>
                  {baycMetadata.attributes.map((attr, index) => (
                    <Box
                      key={index}
                      sx={{
                        px: isMobile ? 0.75 : 1,
                        py: isMobile ? 0.375 : 0.5,
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.06)',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          color: '#777',
                          fontSize: isMobile ? '0.5625rem' : '0.625rem',
                          lineHeight: 1.2,
                          display: 'block',
                        }}
                      >
                        {attr.trait_type}
                      </Typography>
                      <Typography
                        noWrap
                        sx={{
                          color: '#eee',
                          fontSize: isMobile ? '0.625rem' : '0.7rem',
                          fontWeight: 500,
                          lineHeight: 1.3,
                        }}
                      >
                        {attr.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {apeData.isMinted && apeData.editorUrl && (
              <Box sx={{ mt: 'auto', pt: isMobile ? 0.25 : 1, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  component="a"
                  href={apeData.editorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                  startIcon={!isMobile && <LaunchIcon />}
                  sx={{
                    bgcolor: '#3f51b5',
                    color: '#fff',
                    py: isMobile ? 0.875 : 1.25,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: isMobile ? '0.8125rem' : '0.9rem',
                    minHeight: isMobile ? 36 : undefined,
                    '&:hover': {
                      bgcolor: '#303f9f',
                    },
                  }}
                >
                  Open in Editor
                </Button>
              </Box>
            )}

            {!apeData.isMinted && apeData.claimUrl && (
              <Box sx={{ mt: 'auto', flexShrink: 0 }}>
                {!isMobile && (
                  <>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: '#999',
                        mb: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      Ready to mint?
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: '#bbb', mb: 2, lineHeight: 1.6 }}
                    >
                      Your AFA is waiting. Claim and mint #{apeData.tokenId} to unlock the full artwork.
                    </Typography>
                  </>
                )}
                <Button
                  variant="contained"
                  component="a"
                  href={apeData.claimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                  startIcon={!isMobile && <LaunchIcon />}
                  sx={{
                    bgcolor: '#6ee7a0',
                    color: '#0d0f12',
                    py: isMobile ? 0.875 : 1.25,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: isMobile ? '0.8125rem' : '0.9rem',
                    fontWeight: 700,
                    minHeight: isMobile ? 36 : undefined,
                    '&:hover': {
                      bgcolor: '#34d399',
                    },
                  }}
                >
                  Mint Your AFA
                </Button>
              </Box>
            )}
          </Box>
        </Card>
      </Box>
    </Modal>
  );
};

export default ApeDetailsModal;
