import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { usePublisher, insertImage$, ButtonWithTooltip } from "@mdxeditor/editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { fileService } from "~/services/fileService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

/**
 * Replaces MDXEditor's own "insert image" toolbar button + dialog, which
 * ships unstyled (plain inputs, default Save/Cancel). Inserts via the
 * public `insertImage$` signal instead of going through the native dialog.
 */
export default function MarkdownInsertImageButton() {
    const { t } = useTranslation();
    const insertImage = usePublisher(insertImage$);
    const [isOpen, setIsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [urlValue, setUrlValue] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const close = () => {
        setIsOpen(false);
        setUrlValue("");
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const uploaded = await fileService.upload(file);
            insertImage({ src: uploaded.url, altText: file.name });
            close();
        } catch (err) {
            toast.error(getErrorMessage(err, t("component.fileUpload.uploadError")));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleInsertUrl = () => {
        if (!urlValue.trim()) return;
        insertImage({ src: urlValue.trim() });
        close();
    };

    return (
        <>
            <ButtonWithTooltip title={t("markdownEditor.insertImage")} onClick={() => setIsOpen(true)}>
                <FontAwesomeIcon icon={faImage} />
            </ButtonWithTooltip>
            {isOpen &&
                createPortal(
                    <Modal isOpen={isOpen} onClose={close} title={t("markdownEditor.insertImage")} size="sm">
                        <div className="flex flex-col gap-4">
                            <ButtonComponent
                                type="button"
                                variant="primary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <><FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> {t("component.fileUpload.uploading")}</>
                                ) : (
                                    t("dashboard.uploadFile")
                                )}
                            </ButtonComponent>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="flex-1 border-t border-gray-100" />
                                {t("markdownEditor.orPasteUrl")}
                                <div className="flex-1 border-t border-gray-100" />
                            </div>

                            <div className="flex gap-2">
                                <InputComponent
                                    value={urlValue}
                                    onChange={(e) => setUrlValue(e.target.value)}
                                    placeholder="https://..."
                                    className="flex-1"
                                />
                                <ButtonComponent type="button" variant="neutral" onClick={handleInsertUrl} disabled={!urlValue.trim()}>
                                    {t("markdownEditor.insert")}
                                </ButtonComponent>
                            </div>
                        </div>
                    </Modal>,
                    document.body,
                )}
        </>
    );
}
