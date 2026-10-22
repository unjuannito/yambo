import type { ReactNode } from "react";

interface SkeletonCardProps {
    count?: number;
    imageHeight?: string;
    layout?: "grid" | "scroll";
    cardWidth?: string;
    gridCols?: string;
    children?: ReactNode;
}

export default function SkeletonCard({
    count = 3,
    imageHeight = "h-56",
    layout = "grid",
    cardWidth = "min-w-[300px] md:min-w-[380px]",
    gridCols = "md:grid-cols-3",
    children,
}: SkeletonCardProps) {
    const items = Array.from({ length: count }, (_, i) => i);

    if (children) {
        return <>{items.map((i) => <div key={i}>{children}</div>)}</>;
    }

    if (layout === "scroll") {
        return (
            <div className="flex gap-6 overflow-x-auto px-4 pb-4">
                {items.map((i) => (
                    <div
                        key={i}
                        className={`${cardWidth} snap-start bg-white shadow-md rounded-3xl overflow-hidden flex-shrink-0`}
                    >
                        <div className={`w-full ${imageHeight} bg-gray-200 animate-pulse`} />
                        <div className="p-5 space-y-3">
                            <div className="h-6 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                            <div className="h-4 w-full bg-gray-100 rounded-lg animate-pulse" />
                            <div className="h-4 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
                            <div className="h-4 w-1/4 bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
            {items.map((i) => (
                <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm animate-pulse overflow-hidden"
                >
                    <div className="aspect-[16/9] bg-gray-200" />
                    <div className="p-4 space-y-3">
                        <div className="h-5 bg-gray-200 rounded-lg w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
