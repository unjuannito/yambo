import { useState, useRef } from "react";
import { issueService } from "~/services/issueService";
import { fileService } from "~/services/fileService";
import { getErrorMessage } from "~/types/error";
import { IssueStatus } from "~/types/issueType";

interface UseIssueCommentFormProps {
    issueId: string;
    currentStatus: IssueStatus;
    onSuccess: () => void;
    canUpdateStatus?: boolean;
}

export const useIssueCommentForm = ({
    issueId,
    currentStatus,
    onSuccess,
    canUpdateStatus = false,
}: UseIssueCommentFormProps) => {
    const [text, setText] = useState("");
    const [nextStatus, setNextStatus] = useState<IssueStatus | "">("");
    const [loading, setLoading] = useState(false);
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [urlModalOpen, setUrlModalOpen] = useState(false);
    const [urlValue, setUrlValue] = useState("");
    const [urlDisplayText, setUrlDisplayText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const maxLength = 2000;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setError(null);
        try {
            const uploaded = await fileService.upload(file);
            if (isHtmlMode) {
                const imgTag = `<img src="${uploaded.url}" />`;
                setText(prev => prev ? `${prev}\n${imgTag}` : imgTag);
            } else {
                setPendingImage(uploaded.url);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Error al subir la imagen"));
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removePendingImage = () => {
        setPendingImage(null);
    };

    const handleAddUrl = () => {
        setUrlValue("");
        setUrlDisplayText("");
        setUrlModalOpen(true);
    };

    const handleUrlCancel = () => {
        setUrlModalOpen(false);
    };

    const handleUrlConfirm = () => {
        if (!urlValue.trim()) return;
        const formattedUrl = urlValue.trim().startsWith('http') || urlValue.trim().startsWith('/')
            ? urlValue.trim()
            : `https://${urlValue.trim()}`;

        let insertion = formattedUrl;
        if (isHtmlMode) {
            insertion = `<a href="${formattedUrl}">${urlDisplayText || formattedUrl}</a>`;
        } else if (urlDisplayText.trim()) {
            insertion = `[${urlDisplayText.trim()}](${formattedUrl})`;
        }

        setText(prev => prev ? `${prev} ${insertion}` : insertion);
        setUrlModalOpen(false);
        setTimeout(() => textareaRef.current?.focus(), 10);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(null);

        const trimmedText = text.trim();
        if (!trimmedText && !pendingImage) {
            setError("¡No nos dejes en ascuas! Escribe algo o sube una imagen");
            return;
        }

        setLoading(true);

        try {
            const hasStatusChange =
                canUpdateStatus &&
                nextStatus !== "" &&
                nextStatus !== currentStatus;

            let finalMessage = trimmedText;
            if (pendingImage) {
                finalMessage = trimmedText 
                    ? `${trimmedText}\n\n${pendingImage}`
                    : pendingImage;
            }

            await issueService.addComment(issueId, {
                text: finalMessage,
                status: hasStatusChange
                    ? (nextStatus as IssueStatus)
                    : undefined,
            });

            setText("");
            setPendingImage(null);
            setNextStatus("");
            onSuccess();
        } catch (err) {
            setError(getErrorMessage(err, "Error al agregar comentario"));
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setText("");
        setPendingImage(null);
        setNextStatus("");
        setError(null);
    };

    return {
        text,
        setText,
        nextStatus,
        setNextStatus,
        loading,
        isHtmlMode,
        setIsHtmlMode,
        uploadingImage,
        pendingImage,
        error,
        setError,
        fileInputRef,
        textareaRef,
        maxLength,
        handleImageUpload,
        removePendingImage,
        handleAddUrl,
        handleUrlCancel,
        handleUrlConfirm,
        urlModalOpen,
        setUrlModalOpen,
        urlValue,
        setUrlValue,
        urlDisplayText,
        setUrlDisplayText,
        handleSubmit,
        clearForm,
    };
};
