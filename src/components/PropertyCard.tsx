import { Link, useNavigate } from "react-router-dom";
import { MapPin, BedDouble, Bath, Maximize, ZoomIn, ZoomOut, RefreshCw, Calendar, Sparkles, Instagram, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ResponsiveImage from "@/components/ResponsiveImage";
import ImageLightbox from "@/components/ImageLightbox";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { formatPrice, toTitleCase, cleanListingText } from "@/lib/data";
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
    <div className="h-full">
      <div className="group h-full flex flex-col">
        <div className="bg-card rounded-2xl overflow-hidden border border-border/80 shadow-card hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-1.5 flex flex-col h-full focus-within:ring-2 focus-within:ring-accent relative">
          
          {/* 16:10 Ratio Image Container with Click-to-Open Viewer */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/property/${property.id}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/property/${property.id}`);
              }
            }}
            className="group/image relative aspect-[4/3] sm:aspect-[16/10] w-full bg-muted/60 overflow-hidden cursor-pointer select-none"
            aria-label={`Open details for ${toTitleCase(property.title)}`}
            title="Open property details"
          >
            {Array.isArray(property.images) && property.images.length > 1 ? (
              <div className="h-full" onClick={(e) => e.stopPropagation()}>
                <Carousel className="w-full h-full [&>div]:h-full">
                  <CarouselPrevious
                    onClick={(e) => e.stopPropagation()}
                    className="left-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 h-8 w-8 bg-black/50 text-white border-0 hover:bg-black/70"
                  />
                  <CarouselNext
                    onClick={(e) => e.stopPropagation()}
                    className="right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 h-8 w-8 bg-black/50 text-white border-0 hover:bg-black/70"
                  />
                  <CarouselContent className="h-full ml-0">
                    {property.images.map((src: string, i: number) => (
                      <CarouselItem
                        key={i}
                        className="group/image pl-0 h-full cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/property/${property.id}`);
                        }}
                      >
                        {src ? (
                          <ResponsiveImage
                            src={src}
                            alt={`${toTitleCase(property.title)} view ${i + 1}`}
                            ratio="none"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="w-full h-full"
                            imageClassName="transition-transform duration-700 ease-out group-hover/image:scale-105"
                            loading="lazy"
                            priority={index < 4 && i < 2}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">No image</div>
                        )}
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            ) : imgSrc && !imgError ? (
              <ResponsiveImage
                src={imgSrc}
                alt={toTitleCase(property.title)}
                ratio="none"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="w-full h-full"
                imageClassName="transition-transform duration-700 ease-out group-hover/image:scale-105"
                loading="lazy"
                priority={index < 4}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/80">
                <span className="text-xs uppercase tracking-wider font-mono">No photo preview</span>
              </div>
            )}

            {/* Gradient Overlay on bottom of image for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />

            {/* Floating Top Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 max-w-[65%]">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm bg-primary text-primary-foreground border border-primary-foreground/20 backdrop-blur-md">
                {cleanListingText(property.status)}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm bg-white/85 dark:bg-card/85 text-foreground backdrop-blur-md border border-white/40 dark:border-white/10">
                {cleanListingText(property.type)}
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
            <div className="absolute bottom-3 left-3 z-20 max-w-[70%]">
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
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

          {/* Card Body - Links to Property Details */}
          <Link
            to={`/property/${property.id}`}
            className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3 focus:outline-none"
            aria-label={`Open details for ${toTitleCase(property.title)}`}
          >
            <div>
              <h3 className="font-display text-lg font-bold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {toTitleCase(property.title)}
              </h3>

              {property.location && (
                <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs sm:text-sm font-body line-clamp-1">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{cleanListingText(property.location)}</span>
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
          </Link>

          {/* Footer Action Row */}
          <div className="px-4 pb-4 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/40">
            {walkthroughUrl ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
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
            <Button
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const bookingPath = `/book?propertyId=${encodeURIComponent(property.id)}`;
                if (window.localStorage.getItem("a2z_auth_user")) {
                  navigate(bookingPath);
                } else {
                  navigate(`/auth?redirect=${encodeURIComponent(bookingPath)}`);
                }
              }}
              className="h-8 px-3 text-xs bg-accent text-accent-foreground hover:brightness-110 font-semibold shadow-xs shrink-0"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Book Visit
            </Button>
          </div>
        </div>
      </div>

    {/* Reusable Lightbox Modal */}
    {viewerOpen && (
      <ImageLightbox
        images={images}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title={toTitleCase(property.title)}
      />
    )}

    {/* keyboard navigation handled via top-level useEffect */}

  </div>
  );
};

export default React.memo(PropertyCard);
