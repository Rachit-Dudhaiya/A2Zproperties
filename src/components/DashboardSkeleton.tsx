import Skeleton from "react-loading-skeleton";

const DashboardSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Skeleton height={36} width={200} />
          <Skeleton height={20} width={300} className="mt-1" />
        </div>
        <Skeleton height={40} width={150} />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Skeleton circle height={28} width={28} />
              <div>
                <Skeleton height={24} width={50} />
                <Skeleton height={16} width={80} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        {/* Tabs List */}
        <div className="flex flex-wrap gap-1">
          <Skeleton height={40} width={120} />
          <Skeleton height={40} width={120} />
          <Skeleton height={40} width={120} />
          <Skeleton height={40} width={120} />
        </div>

        {/* Tab Content Skeleton */}
        <div className="bg-card rounded-lg shadow-card overflow-hidden p-4 space-y-3">
            <div className="p-4 border-b border-border">
                <Skeleton height={36} width="80%" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Skeleton height={20} width={150} />
                            <Skeleton height={16} width={250} className="mt-1" />
                        </div>
                        <Skeleton height={24} width={80} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Skeleton height={32} width={32} />
                        <Skeleton height={32} width={32} />
                        <Skeleton height={32} width={32} />
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;