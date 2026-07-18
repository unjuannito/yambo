import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  onUpload?: (file: FileRecord) => void;
  onDelete?: (fileId: string) => void;
  existingFiles?: FileRecord[];
  multiple?: boolean;
  maxSizeMb?: number;
  accept?: string;
  className?: string;
  label?: string;
  compact?: boolean;
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

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
  const { t } = useTranslation();
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
            if (!multiple) return [uploaded];
            return [...prev, uploaded];
          });
          onUpload?.(uploaded);
        }
      } catch (err) {
        setError(getErrorMessage(err, t("component.fileUpload.uploadError")));
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [multiple, onUpload, t]
  );

  const handleDelete = useCallback(
    async (fileId: string) => {
      try {
        await fileService.deleteFile(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        onDelete?.(fileId);
      } catch (err) {
        setError(getErrorMessage(err, t("component.fileUpload.deleteError")));
      }
    },
    [onDelete, t]
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

  // Compact single-file mode
  if (compact && !multiple) {
    const currentFile = files[0];
    const isCurrentImage = currentFile && isImage(currentFile.contentType);
    const uploadButtonLabel = uploading ? (
      <>
        <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
        {t("component.fileUpload.uploading")}
      </>
    ) : currentFile ? (
      t("component.fileUpload.changeFile")
    ) : (
      t("component.fileUpload.uploadFile")
    );
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {currentFile ? (
          <div className="relative group">
            {isCurrentImage ? (
              <img
                src={currentFile.url}
                alt={currentFile.originalName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-yambo-green-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-yambo-green-50 border-2 border-yambo-green-100 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={getFileIcon(currentFile.contentType)}
                  className="text-yambo-green-400 text-2xl"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDelete(currentFile.id)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title={t("component.fileUpload.delete")}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-yambo-green-50 border-2 border-dashed border-yambo-green-200 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faCloudUploadAlt}
              className="text-yambo-green-300"
            />
          </div>
        )}
        <div>
          {label && (
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {label}
            </p>
          )}
          <button
            type="button"
            onClick={openFilePicker}
            disabled={uploading}
            className="text-sm text-yambo-green-600 hover:text-yambo-green-800 disabled:text-gray-400 font-medium transition-colors"
          >
            {uploadButtonLabel}
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
        <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFilePicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
        role="button"
        tabIndex={0}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 hover-lift ${
          dragActive
            ? "border-yambo-green-500 bg-yambo-green-50"
            : "border-yambo-green-200 hover:border-yambo-green-400 bg-yambo-green-50/30"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="text-yambo-green-500 text-2xl"
            />
            <p className="text-sm text-gray-500">{t("component.fileUpload.uploading")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FontAwesomeIcon
              icon={faCloudUploadAlt}
              className="text-yambo-green-300 text-3xl"
            />
            <p className="text-sm text-gray-500">
              {t("component.fileUpload.dragOr")}
              <span className="text-yambo-green-600 font-semibold">
                {t("component.fileUpload.clickToSelect")}
              </span>
            </p>
            <p className="text-xs text-gray-400">{t("component.fileUpload.maxSize", { size: maxSizeMb })}</p>
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

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover-lift"
            >
              {isImage(f.contentType) ? (
                <img
                  src={f.url}
                  alt={f.originalName}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-yambo-green-50/50 flex flex-col items-center justify-center gap-2">
                  <FontAwesomeIcon
                    icon={getFileIcon(f.contentType)}
                    className="text-gray-400 text-3xl"
                  />
                  <p className="text-xs text-gray-500 px-2 text-center truncate max-w-full">
                    {f.originalName}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center rounded-2xl">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(f.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  title={t("component.fileUpload.delete")}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl">
                {f.originalName}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
