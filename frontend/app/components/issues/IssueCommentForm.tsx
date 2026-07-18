import React from "react";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { Modal } from "~/components/common/Modal";
import { useIssueCommentForm } from "~/hooks/useIssueCommentForm";
import {
    IssueStatus,
    ISSUE_STATUS_CONFIG,
    ISSUE_WORKFLOW_TRANSITIONS,
} from "~/types/issueType";

interface IssueCommentFormProps {
    issueId: string;
    currentStatus: IssueStatus;
    canUpdateStatus?: boolean;
    onSuccess: () => void;
}

/**
 * Subcomponente para previsualizar la imagen que se va a subir
 */
const ImagePreview: React.FC<{
    url: string;
    onRemove: () => void;
}> = ({ url, onRemove }) => {
    const { t } = useTranslation();
    return (
        <figure className="p-3 bg-white border-b-2 border-slate-100 flex items-center gap-3">
            <div className="relative h-16 w-16 rounded-lg overflow-hidden border-2 border-slate-100 shrink-0">
                <img src={url} alt={t('common.preview') || "Preview"} className="h-full w-full object-cover" />
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors z-10"
                    aria-label={t('common.delete')}
                >
                    <XIcon size={12} strokeWidth={3} />
                </button>
            </div>
            <figcaption className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('issues.imageReady') || "Imagen lista para enviar"}</figcaption>
        </figure>
    );
};

/**
 * Selector de estado simplificado
 */
const StatusSelector: React.FC<{
    currentStatus: IssueStatus;
    nextStatus: string;
    onChange: (status: IssueStatus | "") => void;
    disabled: boolean;
}> = ({ currentStatus, nextStatus, onChange, disabled }) => {
    const { t } = useTranslation();
    const allowedTransitions = ISSUE_WORKFLOW_TRANSITIONS[currentStatus] || [];

    return (
        <label className="flex items-center gap-1.5 border-l-2 border-slate-100 pl-3">
            <select
                value={nextStatus}
                onChange={(e) => onChange(e.target.value as IssueStatus | "")}
                disabled={disabled}
                className="appearance-none bg-transparent text-[11px] font-bold text-gray-600 focus:outline-none cursor-pointer hover:text-yambo-green-600 transition-colors"
            >
                <option value="">{t('issues.changeStatus') || "Cambiar estado..."}</option>
                {allowedTransitions.map((status) => (
                    <option key={status} value={status}>
                        {ISSUE_STATUS_CONFIG[status].label}
                    </option>
                ))}
            </select>
        </label>
    );
};

// --- Iconos internos ---

const XIcon = ({ size = 18, strokeWidth = 2 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ImageIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
);

const LinkIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
);

const SendIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

// --- Componente Principal ---

export const IssueCommentForm: React.FC<IssueCommentFormProps> = ({
    issueId,
    currentStatus,
    canUpdateStatus = false,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const {
        text,
        setText,
        nextStatus,
        setNextStatus,
        loading,
        uploadingImage,
        pendingImage,
        error,
        fileInputRef,
        textareaRef,
        maxLength,
        handleImageUpload,
        removePendingImage,
        handleAddUrl,
        handleUrlCancel,
        handleUrlConfirm,
        urlModalOpen,
        urlValue,
        setUrlValue,
        urlDisplayText,
        setUrlDisplayText,
        handleSubmit,
    } = useIssueCommentForm({ issueId, currentStatus, onSuccess, canUpdateStatus });

    return (
        <>
        <form onSubmit={handleSubmit} className="relative">
            {error && (
                <div className="absolute bottom-full left-0 right-0 mb-2">
                    <ErrorMessage message={error} />
                </div>
            )}

            <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden focus-within:ring-4 focus-within:ring-yambo-green-500/10 focus-within:border-yambo-green-400 transition-all">
                {pendingImage && <ImagePreview url={pendingImage} onRemove={removePendingImage} />}

                <section className={`p-2 ${loading ? "pointer-events-none opacity-50" : ""}`}>
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        maxLength={maxLength}
                        placeholder={t('issues.writeMessage') || "Escribe un mensaje..."}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-yambo-black placeholder-gray-400 resize-none min-h-[40px] max-h-[150px] py-2 px-3 custom-scrollbar focus:outline-none"
                        rows={1}
                        aria-label={t('issues.messageContent') || "Contenido del mensaje"}
                    />
                </section>

                <footer className="flex items-center justify-between gap-3 px-3 py-2 bg-white border-t-2 border-slate-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || uploadingImage || !!pendingImage}
                            className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${uploadingImage ? "animate-pulse bg-gray-100" : "bg-slate-100 text-gray-500 hover:bg-slate-200 hover:text-yambo-green-600"
                                }`}
                            title={t('issues.attachImage') || "Adjuntar imagen"}
                            aria-label={t('issues.attachImage') || "Adjuntar imagen"}
                        >
                            {uploadingImage ? (
                                <div className="h-4 w-4 border-2 border-yambo-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <ImageIcon />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleAddUrl}
                            disabled={loading}
                            className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-gray-500 hover:bg-slate-200 hover:text-yambo-green-600 transition-colors"
                            title={t('issues.addLink') || "Añadir enlace"}
                            aria-label={t('issues.addLink') || "Añadir enlace"}
                        >
                            <LinkIcon />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" aria-hidden="true" />

                        {canUpdateStatus && (
                            <StatusSelector
                                currentStatus={currentStatus}
                                nextStatus={nextStatus}
                                onChange={setNextStatus}
                                disabled={loading}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <data value={text.length} className={`text-[10px] font-mono font-bold ${text.length > maxLength * 0.9 ? "text-red-500" : "text-gray-400"}`}>
                            {text.length}/{maxLength}
                        </data>

                        <button
                            type="submit"
                            disabled={loading || uploadingImage || (!text.trim() && !pendingImage)}
                            className={`flex items-center justify-center h-9 w-9 rounded-full transition-all shadow-sm ${(!text.trim() && !pendingImage) || loading || uploadingImage
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                    : "bg-yambo-green-500 text-white hover:bg-yambo-green-600 active:scale-95 border border-yambo-green-600 shadow-md"
                                }`}
                            title={t('issues.sendMessage') || "Enviar mensaje"}
                            aria-label={t('issues.sendMessage') || "Enviar mensaje"}
                        >
                            {loading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <SendIcon />
                            )}
                        </button>
                    </div>
                </footer>
            </div>
        </form>

        {/* URL input modal */}
        <Modal isOpen={urlModalOpen} onClose={handleUrlCancel} title={t('issues.addLink') || "Añadir enlace"} size="sm">
            <div className="flex flex-col gap-4">
                <InputComponent
                    label="URL"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://..."
                    autoFocus
                />
                <InputComponent
                    label={t('issues.displayText') || "Texto a mostrar (opcional)"}
                    value={urlDisplayText}
                    onChange={(e) => setUrlDisplayText(e.target.value)}
                    placeholder={t('issues.linkText') || "Texto del enlace"}
                />
                <div className="flex justify-end gap-2 pt-2">
                    <ButtonComponent type="button" variant="neutral" onClick={handleUrlCancel}>
                        {t('common.cancel')}
                    </ButtonComponent>
                    <ButtonComponent type="button" variant="primary" onClick={handleUrlConfirm} disabled={!urlValue.trim()}>
                        {t('common.add') || "Añadir"}
                    </ButtonComponent>
                </div>
            </div>
        </Modal>
        </>
    );
};
