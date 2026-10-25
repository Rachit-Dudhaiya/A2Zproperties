import { Link, useNavigate } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize, ZoomIn, ZoomOut, RefreshCw, Calendar, Sparkles, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { formatPrice } from "@/lib/data";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * If the URL is from Cloudinary, it inserts image optimization parameters.
 * This requests a smaller, auto-formatted, and auto-quality image for previews.
 */
const getOptimizedUrl = (url: string, options: { width: number; height: number }) => {
  if (url && url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/w_${options.width},h_${options.height},c_fill,q_auto,f_auto/${parts[1]}`;
    }
  }
  return url;
};

interface PropertyData {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  location: string | null;
  is_featured: boolean | null;
  images?: string[] | null;
  image_url?: string | null;
  agent_avatar?: string | null;
  agent_name?: string | null;
  video_url?: string | null;
  instagram_reel_url?: string | null;
  walkthrough_url?: string | null;
  has_walkthrough?: boolean | null;
}

interface Props {
  property: PropertyData;
  index?: number;
}

const PropertyCard = ({ property, index = 0 }: Props) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const pinchStartPanXRef = useRef<number | null>(null);
  const pinchStartPanYRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  const getMaxPan = useCallback(() => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img || !naturalSize) return { maxX: 0, maxY: 0 };
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const nw = naturalSize.w;
    const nh = naturalSize.h;
    const baseScale = Math.min(cw / nw, ch / nh);
    const baseW = nw * baseScale;
    const baseH = nh * baseScale;
    const scaledW = baseW * zoom;
    const scaledH = baseH * zoom;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return { maxX, maxY };
  }, [naturalSize, zoom]);

  const images: string[] = Array.isArray(property.images) && property.images.length > 0
    ? property.images
    : property.image_url
      ? [property.image_url]
      : [];

  const getImageSrc = (p: any) => {
    if (!p) return null;
    const candidates = [p.image_url, p.image, p.images?.[0], p.photos?.[0], p.photo_url, p.gallery?.[0]];
    for (const c of candidates) {
      if (c && typeof c === "string" && c.trim() !== "") return c;
    }
    return null;
  };

  const imgSrc = getImageSrc(property);
  const walkthroughUrl = property.instagram_reel_url || property.video_url || property.walkthrough_url || null;

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    navigate(`/property/${property.id}`);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(`/property/${property.id}`);
    }
  };

  // Keyboard navigation for lightbox viewer
  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setViewerOpen(false);
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        setViewerIndex((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        setViewerIndex((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, images.length]);

  // Reset zoom when opening viewer or changing image
  useEffect(() => {
    if (viewerOpen) setZoom(1);
    setPanX(0);
    setPanY(0);
    isPanningRef.current = false;
    setIsPanning(false);
  }, [viewerOpen, viewerIndex]);

  // Clamp pan when zoom or measurements change
  useEffect(() => {
    const { maxX, maxY } = getMaxPan();
    setPanX((px) => clamp(px, -maxX, maxX));
    setPanY((py) => clamp(py, -maxY, maxY));
  }, [zoom, naturalSize, getMaxPan]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <div className="group h-full flex flex-col">
        <div
          className="bg-card rounded-2xl overflow-hidden border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-1.5 cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          role="button"
          tabIndex={0}
          aria-label={`Open details for ${property.title}`}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
        >
          {/* 16:10 Ratio Image Container with Hover Zoom */}
          <div className="relative aspect-[16/10] w-full bg-muted/60 overflow-hidden">
            {Array.isArray(property.images) && property.images.length > 1 ? (
              <Carousel className="w-full h-full">
                <CarouselPrevious className="left-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 h-8 w-8 bg-black/50 text-white border-0 hover:bg-black/70" />
                <CarouselNext className="right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 h-8 w-8 bg-black/50 text-white border-0 hover:bg-black/70" />
                <CarouselContent className="h-full ml-0">
                  {property.images.map((src: string, i: number) => (
                    <CarouselItem key={i} className="pl-0 h-full">
                      {src ? (
                        <img
                          src={getOptimizedUrl(src, { width: 500, height: 312 })}
                          alt={`${property.title} view ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">No image</div>
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : imgSrc && !imgError ? (
              <img
                src={getOptimizedUrl(imgSrc, { width: 500, height: 312 })}
                alt={property.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/80">
                <span className="text-xs uppercase tracking-wider font-mono">No photo preview</span>
              </div>
            )}

            {/* Gradient Overlay on bottom of image for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

            {/* Floating Top Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm bg-primary text-primary-foreground border border-primary-foreground/20 backdrop-blur-md">
                {property.status}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm bg-white/85 dark:bg-card/85 text-foreground backdrop-blur-md border border-white/40 dark:border-white/10">
                {property.type}
              </span>
            </div>

            {property.is_featured && (
              <div className="absolute top-3 right-3 z-20">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border border-amber-300">
                  <Sparkles className="h-3 w-3 fill-current" />
                  Featured
                </span>
              </div>
            )}

            {/* Floating Price Pill Bottom-Left */}
            <div className="absolute bottom-3 left-3 z-20">
              <div className="px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-md">
                <span className="font-display font-bold text-base sm:text-lg tracking-tight">
                  {formatPrice(property.price)}
                </span>
                {property.status === "For Rent" && (
                  <span className="text-xs font-normal text-white/80 ml-1">/mo</span>
                )}
              </div>
            </div>

            {/* Floating Expand Trigger Bottom-Right */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex(0);
                  setViewerOpen(true);
                }}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Expand photo viewer"
                title="View full gallery"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {property.title}
              </h3>

              {property.location && (
                <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs sm:text-sm font-body line-clamp-1">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{property.location}</span>
                </div>
              )}
            </div>

            {/* Meta Row: Beds / Baths / Sqft Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/60 text-xs text-muted-foreground font-body">
              {property.bedrooms && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-medium">
                  <BedDouble className="h-3.5 w-3.5 text-primary" /> {property.bedrooms} BHK
                </span>
              )}
              {property.bathrooms && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-medium">
                  <Bath className="h-3.5 w-3.5 text-primary" /> {property.bathrooms} Bath
                </span>
              )}
              {property.area && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 font-medium ml-auto">
                  {property.area} sqft
                </span>
              )}
            </div>

            {/* Footer Row with Book Visit & View Walkthrough */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {walkthroughUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(walkthroughUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/25 hover:from-pink-500/20 hover:border-pink-500/50 hover:scale-[1.02] active:scale-95 transition-all shadow-xs cursor-pointer"
                  title="Watch Instagram Walkthrough Reel"
                >
                  <Instagram className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                  <span>View Walkthrough</span>
                </button>
              ) : (
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Verified Listing
                </div>
              )}
              <Link
                to={`/book?propertyId=${property.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-accent text-accent-foreground hover:brightness-110 font-semibold shadow-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Book Visit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

    {/* Image viewer modal (lightbox) */}
    {viewerOpen && images.length > 0 && (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/70" onClick={() => setViewerOpen(false)} />
        <motion.div className="relative z-10 mx-4 w-full max-w-5xl" initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
          <div className="bg-black rounded-lg overflow-hidden shadow-2xl">
              <div className="relative">
              <div
                className={`w-full h-[65vh] sm:h-[80vh] bg-black rounded-md overflow-hidden`}
                ref={containerRef}
                style={{ touchAction: 'none', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                onWheel={(e) => {
                  if (e.ctrlKey) return; // allow browser zoom
                  if (!viewerOpen) return;
                  e.preventDefault();
                  const delta = -e.deltaY;
                  if (Math.abs(delta) < 1) return;
                  const step = 0.15;
                  if (delta > 0) setZoom((z) => Math.min(3, +(z + step).toFixed(2)));
                  else setZoom((z) => Math.max(1, +(z - step).toFixed(2)));
                }}
                onPointerDown={(e) => {
                  // start panning only for mouse/pointer when zoomed
                  if (zoom <= 1) return;
                  isPanningRef.current = true;
                  setIsPanning(true);
                  lastPosRef.current = { x: e.clientX, y: e.clientY };
                  try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch {}
                }}
                onTouchStart={(e) => {
                  // record touch start for swipe detection (only when not zoomed)
                  if (!e.touches?.length) return;
                  if (e.touches.length === 2) {
                    // start pinch
                    const a = e.touches[0];
                    const b = e.touches[1];
                    const dx = b.clientX - a.clientX;
                    const dy = b.clientY - a.clientY;
                    pinchStartDistRef.current = Math.hypot(dx, dy);
                    pinchStartZoomRef.current = zoom;
                    pinchStartPanXRef.current = panX;
                    pinchStartPanYRef.current = panY;
                    // center in container coordinates
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      pinchCenterRef.current = { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
                    } else pinchCenterRef.current = null;
                    // clear single-touch swipe start
                    touchStartRef.current = null;
                    return;
                  }
                  if (zoom > 1) return;
                  const t = e.touches[0];
                  touchStartRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchMove={(e) => {
                  if (e.touches?.length === 2 && pinchStartDistRef.current && pinchStartZoomRef.current) {
                    // pinch-to-zoom
                    const a = e.touches[0];
                    const b = e.touches[1];
                    const dx = b.clientX - a.clientX;
                    const dy = b.clientY - a.clientY;
                    const dist = Math.hypot(dx, dy);
                    const startDist = pinchStartDistRef.current;
                    if (startDist === 0) return;
                    const scale = dist / startDist;
                    const newZoom = Math.max(1, Math.min(3, +(pinchStartZoomRef.current! * scale).toFixed(3)));
                    // adjust pan so the pinch center stays focused
                    const rect = containerRef.current?.getBoundingClientRect();
                    const center = pinchCenterRef.current;
                    const startPanX = pinchStartPanXRef.current ?? 0;
                    const startPanY = pinchStartPanYRef.current ?? 0;
                    if (rect && center) {
                      const ratio = newZoom / (pinchStartZoomRef.current ?? 1);
                      const cx = center.x;
                      const cy = center.y;
                      const candidateX = ratio * startPanX + (1 - ratio) * cx;
                      const candidateY = ratio * startPanY + (1 - ratio) * cy;
                      const { maxX, maxY } = getMaxPan();
                      setPanX(clamp(candidateX, -maxX, maxX));
                      setPanY(clamp(candidateY, -maxY, maxY));
                    }
                    setZoom(newZoom);
                    e.preventDefault();
                  }
                }}
                onTouchCancel={() => {
                  pinchStartDistRef.current = null;
                  pinchStartZoomRef.current = null;
                  pinchStartPanXRef.current = null;
                  pinchStartPanYRef.current = null;
                  pinchCenterRef.current = null;
                  touchStartRef.current = null;
                }}
                onTouchEnd={(e) => {
                  // if a pinch was active, clear pinch state
                  if (pinchStartDistRef.current) {
                    pinchStartDistRef.current = null;
                    pinchStartZoomRef.current = null;
                    pinchStartPanXRef.current = null;
                    pinchStartPanYRef.current = null;
                    pinchCenterRef.current = null;
                    touchStartRef.current = null;
                    return;
                  }
                  // double-tap to reset on small devices
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    const now = Date.now();
                    if (lastTapRef.current && (now - lastTapRef.current) < 300) {
                      // double tap detected -> reset
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      lastTapRef.current = null;
                      touchStartRef.current = null;
                      e.preventDefault?.();
                      return;
                    }
                    lastTapRef.current = now;
                  }
                  if (zoom > 1) return;
                  if (!touchStartRef.current) return;
                  // Only enable swipe on small screens
                  if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                    touchStartRef.current = null;
                    return;
                  }
                  const t = e.changedTouches?.[0];
                  if (!t) {
                    touchStartRef.current = null;
                    return;
                  }
                  const dx = t.clientX - touchStartRef.current.x;
                  const dy = t.clientY - touchStartRef.current.y;
                  touchStartRef.current = null;
                  const absX = Math.abs(dx);
                  const absY = Math.abs(dy);
                  const threshold = 50; // px
                  if (absX > threshold && absX > absY) {
                    if (dx < 0 && images.length > 1) {
                      // swipe left -> next
                      setViewerIndex((i) => (i + 1) % images.length);
                    } else if (dx > 0 && images.length > 1) {
                      // swipe right -> prev
                      setViewerIndex((i) => (i - 1 + images.length) % images.length);
                    }
                  }
                }}
                onPointerMove={(e) => {
                  if (!isPanningRef.current || !lastPosRef.current) return;
                  const dx = e.clientX - lastPosRef.current.x;
                  const dy = e.clientY - lastPosRef.current.y;
                  lastPosRef.current = { x: e.clientX, y: e.clientY };
                  const { maxX, maxY } = getMaxPan();
                  setPanX((px) => clamp(px + dx, -maxX, maxX));
                  setPanY((py) => clamp(py + dy, -maxY, maxY));
                }}
                onPointerUp={(e) => {
                  if (!isPanningRef.current) return;
                  isPanningRef.current = false;
                  setIsPanning(false);
                  lastPosRef.current = null;
                  try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch {}
                }}
                onPointerCancel={() => { isPanningRef.current = false; setIsPanning(false); lastPosRef.current = null; }}
              >
                <img
                  ref={imgRef}
                  src={images[viewerIndex]}
                  alt={`property-view-${viewerIndex}`}
                  className="w-full h-full object-contain"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el && el.naturalWidth && el.naturalHeight) setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                  }}
                  style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 120ms', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in' }}
                />
              </div>
              <div className="absolute left-4 bottom-4 bg-black/60 text-white px-3 py-2 rounded-md z-40">
                <div className="text-sm font-semibold">{property.title}</div>
                <div className="text-xs opacity-80">Image {viewerIndex + 1} of {images.length}</div>
              </div>
              <div className="hidden sm:flex absolute top-1 left-1 sm:top-3 sm:left-3 flex items-center gap-2 z-50">
                <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} className="bg-white/90 text-black p-2 rounded shadow"> <ZoomOut className="h-4 w-4" /></button>
                <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="bg-white/90 text-black p-2 rounded shadow"> <ZoomIn className="h-4 w-4" /></button>
                <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); setIsPanning(false); }} className="bg-white/90 text-black p-2 rounded shadow"> <RefreshCw className="h-4 w-4" /></button>
              </div>
              <div className="absolute left-4 bottom-4 bg-black/60 text-white px-3 py-2 rounded-md">
                <div className="text-sm font-semibold">{property.title}</div>
                <div className="text-xs opacity-80">Image {viewerIndex + 1} of {images.length}</div>
              </div>
              <button onClick={() => setViewerOpen(false)} className="absolute top-1 right-1 sm:top-3 sm:right-3 bg-white/90 text-black px-2 py-1 rounded text-sm z-50">Close</button>
              {images.length > 1 && (
                  <>
                  <button onClick={() => setViewerIndex((i) => (i - 1 + images.length) % images.length)} className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 text-black px-4 py-2 rounded-full shadow">‹</button>
                  <button onClick={() => setViewerIndex((i) => (i + 1) % images.length)} className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 text-black px-4 py-2 rounded-full shadow">›</button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex gap-2 overflow-x-auto w-full py-1">
                  {images.map((thumb, ti) => (
                    <button key={ti} onClick={() => setViewerIndex(ti)} className={`flex-none rounded-md overflow-hidden border ${ti === viewerIndex ? 'border-rose-500' : 'border-transparent'} hover:scale-105 transition-transform`}>
                      <img src={getOptimizedUrl(thumb, { width: 80, height: 48 })} alt={`thumb-${ti}`} className="w-20 h-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    )}

    {/* keyboard navigation handled via top-level useEffect */}

  </motion.div>
  );
};

export default PropertyCard;
