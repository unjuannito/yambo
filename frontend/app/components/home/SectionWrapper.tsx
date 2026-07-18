import type { ReactNode } from "react";

interface BlobConfig {
    color: "green" | "purple";
    position: string;
    opacity?: string;
}

interface SectionWrapperProps {
    id?: string;
    sectionIndex: number;
    className?: string;
    blobs?: BlobConfig[];
    title?: string;
    subtitle?: string;
    children: ReactNode;
}

const BLOB_CLASSES: Record<string, string> = {
    green: "blob-green",
    purple: "blob-purple",
};

const GRADIENT_BG =
    "bg-gradient-to-br from-yambo-purple-50/50 via-white to-yambo-green-50/50";

export default function SectionWrapper({
    id,
    sectionIndex,
    className = "",
    blobs,
    title,
    subtitle,
    children,
}: SectionWrapperProps) {
    const isEven = sectionIndex % 2 === 0;
    const bgClass = isEven ? "bg-yambo-white" : GRADIENT_BG;

    return (
        <section
            id={id}
            className={`w-full ${bgClass} ${className} py-4 relative overflow-hidden`}
        >
            {blobs?.map((blob, i) => (
                <div
                    key={`blob-${i}`}
                    className={`${BLOB_CLASSES[blob.color]} ${blob.position} ${blob.opacity ?? "opacity-40"}`}
                />
            ))}

            <div className={`max-w-7xl mx-auto px-4 relative z-10`}>
                {title && (
                    <h2
                        className={`mb-3 font-display text-3xl font-extrabold text-yambo-black text-center md:text-left md:ml-8 md:text-4xl`}
                    >
                        {title}
                    </h2>
                )}
                {subtitle && (
                    <p
                        className={`mb-10 text-center text-gray-500 md:ml-8 md:text-left`}
                    >
                        {subtitle}
                    </p>
                )}

                {children}
            </div>
        </section>
    );
}
