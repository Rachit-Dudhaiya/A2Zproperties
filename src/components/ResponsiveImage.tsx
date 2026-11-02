import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export interface ResponsiveImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  ratio?: "video" | "4/3" | "square" | "16/9" | "16/10" | "auto" | "none";
  priority?: boolean;
  sizes?: string;
  imageClassName?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  objectPosition?: string;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  onLoad?: () => void;
  onError?: () => void;
}

import { getCloudinaryVariant, buildCloudinarySrcSet } from "@/lib/images";

const ratioClassMap: Record<string, string> = {
  video: "aspect-video",
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  square: "aspect-square",
  "1/1": "aspect-square",
  "16/10": "aspect-[16/10]",
  auto: "",
  none: "",
};

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  ratio = "4/3",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  imageClassName,
  objectFit = "cover",
  objectPosition,
  fallbackSrc,
  loading: loadingProp,
  decoding: decodingProp,
  onLoad,
  onError,
  onClick,
  ...restProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const ratioClass = ratioClassMap[ratio] ?? (ratio ? `aspect-[${ratio}]` : "");

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  const isCloudinary = typeof src === "string" && src.includes("res.cloudinary.com") && src.includes("/upload/");
  const srcSet = isCloudinary ? buildCloudinarySrcSet(src, [320, 480, 640, 1024, 1600]) : undefined;
  const mainSrc = isCloudinary ? getCloudinaryVariant(src, priority ? 1200 : 800) : src;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const objectFitClass =
    objectFit === "contain"
      ? "object-contain"
      : objectFit === "fill"
      ? "object-fill"
      : objectFit === "none"
      ? "object-none"
      : "object-cover";

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full bg-muted/50",
        ratioClass,
        className
      )}
      onClick={onClick}
      {...restProps}
    >
      {/* Shimmer Skeleton Placeholder */}
      <div
        className={cn(
          "absolute inset-0 z-0 bg-muted transition-opacity duration-300 pointer-events-none",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-pulse" />
      </div>

      {hasError ? (
        fallbackSrc ? (
          <img
            src={fallbackSrc}
            alt={alt}
            className={cn("absolute inset-0 z-10 w-full h-full", objectFitClass, imageClassName)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-muted-foreground bg-muted/80 text-center select-none">
            <ImageIcon className="h-6 w-6 stroke-1 mb-1 text-muted-foreground/60" />
            <span className="text-[11px] font-mono uppercase tracking-wider">Photo preview</span>
          </div>
        )
      ) : (
        <img
          ref={imgRef}
          src={mainSrc}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? "eager" : loadingProp || "lazy"}
          decoding={priority ? "sync" : decodingProp || "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
          style={objectPosition ? { objectPosition } : undefined}
          className={cn(
            "absolute inset-0 z-10 w-full h-full max-w-full transition-opacity duration-300",
            objectFitClass,
            isLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
        />
      )}
    </div>
  );
};

export default ResponsiveImage;
