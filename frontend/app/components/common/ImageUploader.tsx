import { useState, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCloudUploadAlt,
    faSpinner,
    faTrash,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { imageService } from "~/services/imageService";
import { ImageUsageContext } from "~/types/imageType";
import type { ImageRecord } from "~/types/imageType";
import { getErrorMessage } from "~/types/error";

interface ImageUploaderProps {
    /** Where the image will be used */
    context: ImageUsageContext;
    /** The entity this image belongs to (user id, product id, etc.) */
    referenceId?: string;
    /** Called after a successful upload */
    onUpload?: (image: ImageRecord) => void;
    /** Called after a successful deletion */
    onDelete?: (imageId: string) => void;
    /** Existing images to display */
    existingImages?: ImageRecord[];
    /** Allow multiple images (default: false for USER_PHOTO, true for PRODUCT_IMAGE) */
    multiple?: boolean;
    /** Max file size in MB to display in the hint (reads from backend validation) */
    maxSizeMb?: number;
    /** Custom accepted file types */
    accept?: string;
    /** Additional CSS classes */
    className?: string;
    /** Label text */
    label?: string;
    /** Show small/compact version */
    compact?: boolean;
}

export default function ImageUploader({
    context,
    referenceId,
    onUpload,
    onDelete,
    existingImages = [],
    multiple,
    maxSizeMb = 5,
    accept = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml",
    className = "",
    label,
    compact = false,
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<ImageRecord[]>(existingImages);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMultiple =
        multiple !== undefined
            ? multiple
            : context !== ImageUsageContext.USER_PHOTO;

    const handleFiles = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) return;
            setError(null);
            setUploading(true);

            try {
                const filesToUpload = isMultiple
                    ? Array.from(files)
                    : [files[0]];

                for (const file of filesToUpload) {
                    const uploaded = await imageService.upload(
                        file,
                        context,
                        referenceId
                    );

                    setImages((prev) => {
                        // For replace-previous contexts, the backend already deleted the old one
                        if (!isMultiple) {
                            return [uploaded];
                        }
                        return [...prev, uploaded];
                    });

                    onUpload?.(uploaded);
                }
            } catch (err) {
                setError(getErrorMessage(err, "Error al subir la imagen"));
            } finally {
                setUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        },
        [context, referenceId, isMultiple, onUpload]
    );

    const handleDelete = useCallback(
        async (imageId: string) => {
            try {
                await imageService.deleteImage(imageId);
                setImages((prev) => prev.filter((img) => img.id !== imageId));
                onDelete?.(imageId);
            } catch (err) {
                setError(getErrorMessage(err, "Error al eliminar la imagen"));
            }
        },
        [onDelete]
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            handleFiles(e.target.files);
        },
        [handleFiles]
    );

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    // Compact single-image mode (e.g., user avatar)
    if (compact && !isMultiple) {
        const currentImage = images[0];
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                {currentImage ? (
                    <div className="relative group">
                        <img
                            src={currentImage.url}
                            alt={currentImage.originalName}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        />
                        <button
                            type="button"
                            onClick={() => handleDelete(currentImage.id)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <FontAwesomeIcon
                            icon={faCloudUploadAlt}
                            className="text-gray-400"
                        />
                    </div>
                )}
                <div>
                    {label && (
                        <p className="text-sm font-medium text-gray-700 mb-1">
                            {label}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={uploading}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                        {uploading ? (
                            <>
                                <FontAwesomeIcon
                                    icon={faSpinner}
                                    spin
                                    className="mr-1"
                                />
                                Subiendo...
                            </>
                        ) : currentImage ? (
                            "Cambiar imagen"
                        ) : (
                            "Subir imagen"
                        )}
                    </button>
                    {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>
        );
    }

    // Full dropzone mode
    return (
        <div className={className}>
            {label && (
                <p className="text-sm font-medium text-gray-700 mb-2">
                    {label}
                </p>
            )}

            {/* Dropzone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={openFilePicker}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50"
                } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <FontAwesomeIcon
                            icon={faSpinner}
                            spin
                            className="text-blue-500 text-2xl"
                        />
                        <p className="text-sm text-gray-600">Subiendo...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <FontAwesomeIcon
                            icon={faCloudUploadAlt}
                            className="text-gray-400 text-3xl"
                        />
                        <p className="text-sm text-gray-600">
                            Arrastra una imagen o{" "}
                            <span className="text-blue-600 font-medium">
                                haz clic para seleccionar
                            </span>
                        </p>
                        <p className="text-xs text-gray-400">
                            Máx. {maxSizeMb}MB &middot; JPG, PNG, GIF, WebP,
                            SVG
                        </p>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={isMultiple}
                onChange={handleInputChange}
                className="hidden"
            />

            {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
            )}

            {/* Image previews */}
            {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="relative group rounded-lg overflow-hidden border border-gray-200"
                        >
                            <img
                                src={img.url}
                                alt={img.originalName}
                                className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(img.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                    title="Eliminar"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {img.originalName}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
