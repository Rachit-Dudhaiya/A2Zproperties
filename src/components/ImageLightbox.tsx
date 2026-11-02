import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getCloudinaryVariant } from "@/lib/images";

export interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  title = "Property Photo",
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const thumbsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPanX(0);
      setPanY(0);
    }
  }, [isOpen, initialIndex]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // Reset zoom & pan on slide change
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [currentIndex]);

  // Warm the nearby full-size images before the user navigates to them.
  useEffect(() => {
    if (!isOpen || images.length <= 1) return;

    const nearbyIndexes = [
      currentIndex,
      (currentIndex + 1) % images.length,
      (currentIndex - 1 + images.length) % images.length,
    ];

    nearbyIndexes.forEach((index) => {
      const preloader = new window.Image();
      preloader.decoding = "async";
      preloader.fetchPriority = index === currentIndex ? "high" : "auto";
      preloader.src = getCloudinaryVariant(images[index], 1200);
    });
  }, [currentIndex, images, isOpen]);

  // Auto scroll active thumbnail into view
  useEffect(() => {
    if (!isOpen || !thumbsContainerRef.current) return;
    const activeThumb = thumbsContainerRef.current.children[currentIndex] as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentIndex, isOpen]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation: ESC, Left, Right, +, -
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(4, +(z + 0.5).toFixed(2)));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => {
          const next = Math.max(1, +(z - 0.5).toFixed(2));
          if (next === 1) {
            setPanX(0);
            setPanY(0);
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  const getMaxPan = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return { maxX: 0, maxY: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (zoom - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (zoom - 1)) / 2);
    return { maxX, maxY };
  }, [zoom]);

  // Touch handlers: pinch-zoom, swipe, double-tap
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];

      // Double-tap to zoom
      if (now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        setZoom((prev) => {
          if (prev > 1) {
            setPanX(0);
            setPanY(0);
            return 1;
          }
          return 2.5;
        });
        return;
      }
      lastTapRef.current = now;

      touchStartRef.current = { x: t.clientX, y: t.clientY, time: now };
      if (zoom > 1) {
        lastPosRef.current = { x: t.clientX, y: t.clientY };
        setIsPanning(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      // Pinch move
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / pinchStartDistRef.current;
      const targetZoom = clamp(pinchStartZoomRef.current * scale, 1, 4);
      setZoom(+targetZoom.toFixed(2));
      if (targetZoom === 1) {
        setPanX(0);
        setPanY(0);
      }
      return;
    }

    if (e.touches.length === 1 && zoom > 1 && lastPosRef.current) {
      // Pan when zoomed
      const t = e.touches[0];
      const dx = t.clientX - lastPosRef.current.x;
      const dy = t.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: t.clientX, y: t.clientY };
      const { maxX, maxY } = getMaxPan();
      setPanX((px) => clamp(px + dx, -maxX, maxX));
      setPanY((py) => clamp(py + dy, -maxY, maxY));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    pinchStartDistRef.current = null;
    setIsPanning(false);
    lastPosRef.current = null;

    if (zoom === 1 && touchStartRef.current && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      // Horizontal swipe threshold
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 400) {
        if (dx < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const highResSrc = getCloudinaryVariant(currentImage, 1200);

  return createPortal(
    (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none touch-none"
        role="dialog"
        aria-modal="true"
        aria-label="Fullscreen photo gallery"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 text-white z-30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold text-sm sm:text-base truncate max-w-[180px] sm:max-w-md">
              {title}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-xs font-mono font-semibold tracking-wide">
              {currentIndex + 1} / {images.length}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-white/10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(2)))}
                className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                title="Zoom in (+)"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom((z) => {
                    const next = Math.max(1, +(z - 0.5).toFixed(2));
                    if (next === 1) {
                      setPanX(0);
                      setPanY(0);
                    }
                    return next;
                  });
                }}
                className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                title="Zoom out (-)"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPanX(0);
                    setPanY(0);
                  }}
                  className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                  title="Reset zoom"
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <span className="text-[11px] font-mono text-white/70 ml-1">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Visible Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close lightbox (ESC)"
              title="Close (ESC)"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Main Image Stage */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={() => {
            setZoom((prev) => {
              if (prev > 1) {
                setPanX(0);
                setPanY(0);
                return 1;
              }
              return 2.5;
            });
          }}
        >
          {/* Main Photo */}
          <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
            <img
              ref={imgRef}
              src={highResSrc}
              alt={`${title} - image ${currentIndex + 1}`}
              className="block h-auto max-h-full max-w-full object-contain pointer-events-auto select-none transition-transform duration-75"
              style={{
                transform: `translate3d(${panX}px, ${panY}px, 0px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 150ms cubic-bezier(0.2, 0, 0.2, 1)",
              }}
              onError={(event) => {
                if (event.currentTarget.src !== currentImage) {
                  event.currentTarget.src = currentImage;
                }
              }}
              draggable={false}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>

          {/* Left Arrow Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition-all shadow-xl active:scale-95 z-30 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Previous photo (Left arrow)"
              title="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md transition-all shadow-xl active:scale-95 z-30 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Next photo (Right arrow)"
              title="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className="bg-black/80 border-t border-white/10 px-3 py-2.5 z-30">
            <div
              ref={thumbsContainerRef}
              className="flex items-center gap-2 overflow-x-auto max-w-full py-1 scrollbar-thin scrollbar-thumb-white/20"
            >
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative flex-none h-12 w-16 sm:h-14 sm:w-20 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentIndex
                      ? "border-accent ring-2 ring-accent/40 scale-105"
                      : "border-white/20 opacity-60 hover:opacity-100 hover:border-white/50"
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img
                    src={getCloudinaryVariant(img, 160)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
    ),
    document.body
  );
};

export default ImageLightbox;
