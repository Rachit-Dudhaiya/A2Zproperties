import Skeleton from "react-loading-skeleton";

const SkeletonCard = () => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/70 shadow-card animate-pulse flex flex-col h-full">
      <div className="relative aspect-[16/10] w-full bg-muted/70">
        <Skeleton height="100%" className="absolute inset-0" />
      </div>
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton height={22} width="80%" className="rounded-md" />
          <Skeleton height={15} width="55%" className="rounded-md" />
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Skeleton height={24} width={70} className="rounded-md" />
          <Skeleton height={24} width={70} className="rounded-md" />
        </div>
        <div className="pt-2 flex justify-between items-center">
          <Skeleton height={18} width={90} className="rounded-md" />
          <Skeleton height={32} width={100} className="rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;