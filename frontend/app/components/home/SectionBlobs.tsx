interface BlobItem {
    color: "green" | "purple";
    position: string;
    opacity?: string;
}

interface SectionBlobsProps {
    blobs: BlobItem[];
}

const BLOB_CLASSES: Record<string, string> = {
    green: "blob-green",
    purple: "blob-purple",
};

export default function SectionBlobs({ blobs }: SectionBlobsProps) {
    return (
        <>
            {blobs.map((blob, i) => (
                <div
                    key={`blob-${i}`}
                    className={`${BLOB_CLASSES[blob.color]} ${blob.position} ${blob.opacity ?? "opacity-40"}`}
                />
            ))}
        </>
    );
}
