import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { PhotoCropEditor } from "~/components/PhotoCropEditor";
import { fileService } from "~/services/fileService";
import { downscaleImage, type PhotoEdit } from "~/utils/photoCrop";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCropSimple, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";

export interface StaffPhotoValue {
    /** La foto ya encuadrada, la que se ve en la web. */
    photo: string;
    /** La foto tal como se subió; sin ella se reajusta sobre `photo`. */
    photoOriginal?: string | null;
    photoEdit?: PhotoEdit | null;
}

interface StaffPhotoFieldProps {
    value: StaffPhotoValue;
    onChange: (value: StaffPhotoValue) => void;
    /** Lo que se muestra cuando no hay foto (iniciales). */
    placeholder: React.ReactNode;
    label?: string;
    /** La foto del formulario aún no está guardada. */
    unsaved?: boolean;
}

/**
 * Foto de la ficha del equipo: se elige, se encuadra en el editor y se puede volver a ajustar.
 * Sube los ficheros, pero no guarda la ficha: deja los tres campos en el formulario.
 */
export function StaffPhotoField({ value, onChange, placeholder, label, unsaved = false }: StaffPhotoFieldProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Foto abierta en el editor: la recién subida o la que ya había
    const [editing, setEditing] = useState<{ original: string; edit: PhotoEdit | null } | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setUploading(true);
        try {
            const original = await fileService.upload(await downscaleImage(file));
            setEditing({ original: original.url, edit: null });
        } catch {
            setError(t("photoEditor.uploadError"));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleConfirm = async (edit: PhotoEdit, crop: Blob) => {
        if (!editing) return;
        setSaving(true);
        try {
            const uploaded = await fileService.upload(new File([crop], "foto-perfil.jpg", { type: "image/jpeg" }));
            onChange({ photo: uploaded.url, photoOriginal: editing.original, photoEdit: edit });
            setEditing(null);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-5">
            {value.photo ? (
                <img
                    src={value.photo}
                    alt={t("photoEditor.photoAlt")}
                    className="w-24 h-24 shrink-0 rounded-full object-cover object-top shadow-md ring-4 ring-yambo-green-100"
                />
            ) : (
                <div className="w-24 h-24 shrink-0 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-yambo-green-100">
                    {placeholder}
                </div>
            )}
            <div className="flex flex-col gap-2 min-w-0">
                {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
                <div className="flex flex-wrap gap-2">
                    <ButtonComponent type="button" variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                        {uploading ? (
                            <><FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> {t("photoEditor.uploading")}</>
                        ) : (
                            <><FontAwesomeIcon icon={faCamera} className="mr-1" /> {value.photo ? t("photoEditor.change") : t("photoEditor.upload")}</>
                        )}
                    </ButtonComponent>
                    {value.photo && (
                        <>
                            <ButtonComponent
                                type="button"
                                variant="primary-outline"
                                size="sm"
                                onClick={() => setEditing({ original: value.photoOriginal || value.photo, edit: value.photoOriginal ? value.photoEdit ?? null : null })}
                                disabled={uploading}
                            >
                                <FontAwesomeIcon icon={faCropSimple} className="mr-1" /> {t("photoEditor.adjust")}
                            </ButtonComponent>
                            <ButtonComponent
                                type="button"
                                variant="danger-text"
                                size="sm"
                                onClick={() => onChange({ photo: "", photoOriginal: null, photoEdit: null })}
                            >
                                <FontAwesomeIcon icon={faTrash} className="mr-1" /> {t("photoEditor.remove")}
                            </ButtonComponent>
                        </>
                    )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                {unsaved ? (
                    <p role="status" className="text-xs font-medium text-amber-700">{t("photoEditor.pendingSave")}</p>
                ) : (
                    <p className="text-xs text-gray-400">{t("photoEditor.formats")}</p>
                )}
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" data-testid="staff-photo-input" />
            {editing && (
                <PhotoCropEditor
                    isOpen
                    src={editing.original}
                    initialEdit={editing.edit}
                    onCancel={() => setEditing(null)}
                    onConfirm={handleConfirm}
                    saving={saving}
                />
            )}
        </div>
    );
}

export default StaffPhotoField;
