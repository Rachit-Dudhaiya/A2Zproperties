import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Maximize2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PropertyGalleryProps {
  images: string[];
  title: string;
  status?: string;
  type?: string;
}

export const PropertyGallery: React.FC<PropertyGalleryProps> = ({
  images,
  title,
  status,
  type,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Mobile Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    align: "start",
    skipSnaps: false,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevDesktop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextDesktop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-video w-full rounded-2xl bg-muted border border-border flex flex-col items-center justify-center text-muted-foreground p-6">
        <ImageIcon className="h-12 w-12 stroke-1 mb-2 text-muted-foreground/50" />
        <span className="text-sm font-medium">No photos available for this property</span>
      </div>
    );
  }

  const currentActiveImg = images[selectedIndex] || images[0];

  return (
    <div className="relative w-full select-none">
      {/* ============================================================== */}
      {/* 1. DESKTOP VIEW (Hidden on mobile < 768px): 16:9 + Thumb Strip */}
      {/* ============================================================== */}
      <div className="hidden md:block">
        {/* Big 16:9 Main Image */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => openLightbox(selectedIndex)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openLightbox(selectedIndex);
            }
          }}
          className="group relative aspect-video w-full rounded-2xl overflow-hidden cursor-pointer shadow-card border border-border bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`View enlarged photo ${selectedIndex + 1} for ${title}`}
          title="Click to view fullscreen gallery"
        >
          <ResponsiveImage
            src={currentActiveImg}
            alt={`${title} - Photo ${selectedIndex + 1}`}
            ratio="video"
            priority={true}
            sizes="(max-width: 1024px) 100vw, 800px"
            className="w-full h-full"
            imageClassName="transition-transform duration-500 ease-out group-hover:scale-105"
          />

          {/* Subtle dark gradient overlay for controls readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

          {/* Floating Badges Top-Left */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
            {status && (
              <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1 shadow-md text-xs tracking-wide">
                {status}
              </Badge>
            )}
            {type && (
              <Badge variant="outline" className="bg-white/85 dark:bg-card/85 text-foreground backdrop-blur-md px-3 py-1 shadow-sm text-xs">
                {type}
              </Badge>
            )}
          </div>

          {/* Floating Counter Top-Right */}
          <div className="absolute top-4 right-4 z-10 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 text-xs font-mono font-medium shadow-md">
              {selectedIndex + 1} / {images.length}
            </span>
          </div>

          {/* Hover Expand Icon Pill Bottom-Right */}
          <div className="absolute bottom-4 right-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-medium backdrop-blur-md border border-white/20 shadow-md group-hover:bg-black/80 transition-all">
              <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
            </span>
          </div>

          {/* Desktop Left / Right Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevDesktop}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-lg border border-border/40 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 active:scale-95 focus:opacity-100 focus:outline-none"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNextDesktop}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-lg border border-border/40 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 active:scale-95 focus:opacity-100 focus:outline-none"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Clickable Thumbnail Strip */}
        {images.length > 1 && (
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-border">
            {images.map((src, i) => (
              <button
                key={`${src}-thumb-${i}`}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "relative h-16 w-24 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none",
                  selectedIndex === i
                    ? "border-primary ring-2 ring-primary/30 scale-[1.02] shadow-sm"
                    : "border-border/70 opacity-70 hover:opacity-100 hover:border-border"
                )}
                aria-label={`View photo ${i + 1}`}
              >
                <ResponsiveImage
                  src={src}
                  alt={`${title} thumb ${i + 1}`}
                  ratio="none"
                  className="w-full h-full"
                  imageClassName="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE VIEW (< 768px): Full-width swipeable Embla Carousel */}
      {/* ============================================================== */}
      <div className="block md:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-card border border-border bg-muted/60">
          {/* Swipeable Carousel */}
          <div ref={emblaRef} className="overflow-hidden w-full cursor-grab active:cursor-grabbing">
            <div className="flex touch-pan-y">
              {images.map((src, i) => (
                <div
                  key={`${src}-mobile-${i}`}
                  className="flex-[0_0_100%] min-w-0 relative aspect-[4/3] w-full"
                  onClick={() => openLightbox(i)}
                >
                  <ResponsiveImage
                    src={src}
                    alt={`${title} slide ${i + 1}`}
                    ratio="4/3"
                    priority={i === 0}
                    sizes="100vw"
                    className="w-full h-full"
                    imageClassName="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/25 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Floating Top Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none">
            {status && (
              <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-[11px] shadow-sm">
                {status}
              </Badge>
            )}
            {type && (
              <Badge variant="outline" className="bg-white/85 dark:bg-card/85 text-foreground backdrop-blur-md px-2.5 py-0.5 text-[11px] shadow-xs">
                {type}
              </Badge>
            )}
          </div>

          {/* Counter "3 / 12" Badge Top-Right */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-black/65 text-white backdrop-blur-md border border-white/20 text-[11px] font-mono font-semibold shadow-md">
              {selectedIndex + 1} / {images.length}
            </span>
          </div>

          {/* Tap to expand Hint Bottom-Right */}
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-md border border-white/20">
              <Maximize2 className="h-3 w-3" /> Tap to expand
            </span>
          </div>

          {/* Dots Indicator Bottom-Center */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none">
              {images.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    dotIdx === selectedIndex
                      ? "w-4 h-1.5 bg-white shadow-sm"
                      : "w-1.5 h-1.5 bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. LIGHTBOX MODAL (Shared Mobile & Desktop)                     */}
      {/* ============================================================== */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={title}
      />
    </div>
  );
};

export default PropertyGallery;
