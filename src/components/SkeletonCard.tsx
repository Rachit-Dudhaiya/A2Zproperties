import Skeleton from "react-loading-skeleton";

const SkeletonCard = () => {
    return (
        <div className="bg-card rounded-lg overflow-hidden shadow-card animate-pulse">
            <div className="relative h-48  bg-muted">
                <Skeleton height="100%" />
            </div>
            <div className="p-4 space-y-3">
                <Skeleton height={22} width="75%" />
                <Skeleton height={16} width="55%" />
                <Skeleton height={16} width="80%" />

            </div>
            <div className="p-4 flex justify-between items-center">
                <Skeleton height={32} width={120} />
                <Skeleton height={32} width={120} />
            </div>
        </div>
    );
};

export default SkeletonCard;