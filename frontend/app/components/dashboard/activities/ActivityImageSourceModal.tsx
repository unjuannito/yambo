import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FileUploader from "~/components/common/FileUploader";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import type { FileRecord } from "~/types/fileType";

interface ActivityImageSourceModalProps {
    isOpen: boolean;
    value: string;
    onClose: () => void;
    onChange: (value: string) => void;
}

function resolveImageSrc(value: string): string | null {
    if (!value) return null;
    return value.startsWith("/") ? `/api${value}` : value;
}

export default function ActivityImageSourceModal({
    isOpen,
    value,
    onClose,
    onChange,
}: ActivityImageSourceModalProps) {
    const { t } = useTranslation();
    const [urlValue, setUrlValue] = useState(value);

    useEffect(() => {
        setUrlValue(value);
    }, [value, isOpen]);

    const previewSrc = useMemo(() => resolveImageSrc(value), [value]);

    const handleUpload = (file: FileRecord) => {
        onChange(file.url);
    };

    const handleUseUrl = () => {
        onChange(urlValue.trim());
    };

    const handleClear = () => {
        setUrlValue("");
        onChange("");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('dashboard.imageModalTitle')} size="lg">
            <div className="flex flex-col gap-5">
                {previewSrc && (
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm">
                        <img src={previewSrc} alt={t('dashboard.preview')} className="h-56 w-full object-cover" />
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-yambo-black mb-2">{t('dashboard.uploadFile')}</h3>
                        <p className="text-xs text-gray-400 mb-3">
                            {t('dashboard.uploadFileDesc')}
                        </p>
                        <FileUploader
                            multiple={false}
                            compact={false}
                            accept="image/*"
                            label={t('dashboard.imageSection')}
                            onUpload={handleUpload}
                        />
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-yambo-black">{t('dashboard.pasteUrl')}</h3>
                        <p className="text-xs text-gray-400">
                            {t('dashboard.pasteUrlDesc')}
                        </p>
                        <InputComponent
                            label={t('dashboard.imageUrl')}
                            value={urlValue}
                            onChange={(e) => setUrlValue(e.target.value)}
                            placeholder="https://..."
                        />
                        <div className="flex items-center gap-2">
                            <ButtonComponent type="button" variant="primary" onClick={handleUseUrl} disabled={!urlValue.trim()}>
                                {t('dashboard.useUrl')}
                            </ButtonComponent>
                            <ButtonComponent type="button" variant="neutral" onClick={handleClear} disabled={!value && !urlValue}>
                                {t('dashboard.remove')}
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
