import Skeleton from "react-loading-skeleton";

const PropertyDetailSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="inline-flex items-center gap-2 text-muted-foreground text-sm mb-6">
        <Skeleton width={100} height={20} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Image Carousel Skeleton */}
          <div className="relative h-64 md:h-[420px] bg-muted rounded-lg overflow-hidden">
            <Skeleton height="100%" />
          </div>

          {/* Thumbnails Skeleton */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Skeleton width={80} height={64} />
            <Skeleton width={80} height={64} />
            <Skeleton width={80} height={64} />
            <Skeleton width={80} height={64} />
          </div>

          <div className="mt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                {/* Title and Location Skeleton */}
                <Skeleton height={36} width="70%" />
                <Skeleton height={20} width="40%" className="mt-2" />
              </div>
              {/* Price Skeleton */}
              <Skeleton height={36} width={150} />
            </div>

            {/* Details Skeleton */}
            <div className="mt-6 border-t border-border pt-6">
              <Skeleton height={28} width={100} className="mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {Array.from({ length: 13 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-border pb-2">
                    <Skeleton width="40%" />
                    <Skeleton width="50%" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="mt-6">
              <Skeleton height={28} width={120} className="mb-2" />
              <Skeleton count={4} />
            </div>

            {/* Features Skeleton */}
            <div className="mt-6">
              <Skeleton height={28} width={180} className="mb-3" />
              <div className="flex flex-wrap gap-2">
                <Skeleton width={120} height={34} style={{ borderRadius: 9999 }} />
                <Skeleton width={100} height={34} style={{ borderRadius: 9999 }} />
                <Skeleton width={140} height={34} style={{ borderRadius: 9999 }} />
                <Skeleton width={90} height={34} style={{ borderRadius: 9999 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form Skeleton */}
        <div className="bg-card rounded-lg p-6 shadow-card sticky top-24 h-fit">
          <Skeleton height={32} width="60%" className="mb-4" />
          <Skeleton height={20} count={2} />
          <Skeleton height={40} className="mt-4" />
          <Skeleton height={36} className="mt-2" />
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailSkeleton;