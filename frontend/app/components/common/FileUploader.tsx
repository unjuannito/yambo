import { useState, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCloudUploadAlt,
    faSpinner,
    faTrash,
    faTimes,
    faFile,
    faFilePdf,
    faFileWord,
    faFileExcel,
    faFileArchive,
    faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { fileService } from "~/services/fileService";
import type { FileRecord } from "~/types/fileType";
import { getErrorMessage } from "~/types/error";

interface FileUploaderProps {
    /** Called after a successful upload */
    onUpload?: (file: FileRecord) => void;
    /** Called after a successful deletion */
    onDelete?: (fileId: string) => void;
    /** Existing files to display */
    existingFiles?: FileRecord[];
    /** Allow multiple files */
    multiple?: boolean;
    /** Max file size in MB to display in the hint */
    maxSizeMb?: number;
    /** Custom accepted file types (MIME string or empty for all) */
    accept?: string;
    /** Additional CSS classes */
    className?: string;
    /** Label text */
    label?: string;
    /** Show small/compact version (single-file mode) */
    compact?: boolean;
}

/** Check if a MIME type represents an image */
function isImage(contentType: string): boolean {
    return contentType.startsWith("image/");
}

/** Get an icon for a given MIME type */
function getFileIcon(contentType: string): IconDefinition {
    if (contentType === "application/pdf") return faFilePdf;
    if (
        contentType === "application/msword" ||
        contentType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
        return faFileWord;
    if (
        contentType === "application/vnd.ms-excel" ||
        contentType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
        return faFileExcel;
    if (
        contentType === "application/zip" ||
        contentType === "application/x-rar-compressed" ||
        contentType === "application/gzip" ||
        contentType === "application/x-7z-compressed"
    )
        return faFileArchive;
    if (contentType.startsWith("text/")) return faFileAlt;
    return faFile;
}

export default function FileUploader({
    onUpload,
    onDelete,
    existingFiles = [],
    multiple = true,
    maxSizeMb = 5,
    accept,
    className = "",
    label,
    compact = false,
}: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<FileRecord[]>(existingFiles);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(
        async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) return;
            setError(null);
            setUploading(true);

            try {
                const filesToUpload = multiple
                    ? Array.from(fileList)
                    : [fileList[0]];

                for (const file of filesToUpload) {
                    const uploaded = await fileService.upload(file);

                    setFiles((prev) => {
                        if (!multiple) {
                            return [uploaded];
                        }
                        return [...prev, uploaded];
                    });

                    onUpload?.(uploaded);
                }
            } catch (err) {
                setError(getErrorMessage(err, "Error al subir el archivo"));
            } finally {
                setUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        },
        [multiple, onUpload]
    );

    const handleDelete = useCallback(
        async (fileId: string) => {
            try {
                await fileService.deleteFile(fileId);
                setFiles((prev) => prev.filter((f) => f.id !== fileId));
                onDelete?.(fileId);
            } catch (err) {
                setError(getErrorMessage(err, "Error al eliminar el archivo"));
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

    // Compact single-file mode (e.g., user avatar, project image)
    if (compact && !multiple) {
        const currentFile = files[0];
        const isCurrentImage = currentFile && isImage(currentFile.contentType);
        return (
            <div className={`flex items-center gap-4 ${className}`}>
                {currentFile ? (
                    <div className="relative group">
                        {isCurrentImage ? (
                            <img
                                src={currentFile.url}
                                alt={currentFile.originalName}
                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                <FontAwesomeIcon
                                    icon={getFileIcon(currentFile.contentType)}
                                    className="text-gray-500 text-2xl"
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => handleDelete(currentFile.id)}
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
                        ) : currentFile ? (
                            "Cambiar archivo"
                        ) : (
                            "Subir archivo"
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
                            Arrastra un archivo o{" "}
                            <span className="text-blue-600 font-medium">
                                haz clic para seleccionar
                            </span>
                        </p>
                        <p className="text-xs text-gray-400">
                            Máx. {maxSizeMb}MB
                        </p>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleInputChange}
                className="hidden"
            />

            {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
            )}

            {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {files.map((f) => (
                        <div
                            key={f.id}
                            className="relative group rounded-lg overflow-hidden border border-gray-200"
                        >
                            {isImage(f.contentType) ? (
                                <img
                                    src={f.url}
                                    alt={f.originalName}
                                    className="w-full h-32 object-cover"
                                />
                            ) : (
                                <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center gap-2">
                                    <FontAwesomeIcon
                                        icon={getFileIcon(f.contentType)}
                                        className="text-gray-400 text-3xl"
                                    />
                                    <p className="text-xs text-gray-500 px-2 text-center truncate max-w-full">
                                        {f.originalName}
                                    </p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(f.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                                    title="Eliminar"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {f.originalName}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
