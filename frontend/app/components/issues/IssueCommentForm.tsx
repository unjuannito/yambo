import React, { useState } from "react";
import { issueService } from "~/services/issueService";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
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

export const IssueCommentForm: React.FC<IssueCommentFormProps> = ({
    issueId,
    currentStatus,
    canUpdateStatus = false,
    onSuccess,
}) => {
    const [text, setText] = useState("");
    const [resetKey, setResetKey] = useState(0);
    const [nextStatus, setNextStatus] = useState<IssueStatus | "">("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const maxLength = 2000;

    const allowedTransitions = ISSUE_WORKFLOW_TRANSITIONS[currentStatus] || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const trimmedText = text.trim();
            const hasStatusChange =
                canUpdateStatus &&
                nextStatus !== "" &&
                nextStatus !== currentStatus;

            if (!trimmedText) {
                setError("¡No nos dejes en ascuas! Escribe algo en el comentario");
                setLoading(false);
                return;
            }

            await issueService.addComment(issueId, {
                text: trimmedText,
                status: hasStatusChange
                    ? (nextStatus as IssueStatus)
                    : undefined,
            });

            setText("");
            setResetKey((k) => k + 1);
            setNextStatus("");
            onSuccess();
        } catch (err) {
            setError(
                getErrorMessage(err, "Error al agregar comentario"),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-yambo-green-50/20 rounded-2xl p-5 mb-5 border border-gray-100">
            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit}>
                <div className="mb-2">
                    <label
                        htmlFor="comment"
                        className="block text-sm font-semibold text-yambo-black mb-1.5"
                    >
                        Añadir comentario
                    </label>
                    <div className={loading ? "pointer-events-none opacity-50" : ""}>
                        <MarkdownEditor
                            key={resetKey}
                            value={text}
                            onChange={(val) => setText(val)}
                        />
                    </div>
                </div>

                {canUpdateStatus && (
                    <div className="mb-3">
                        <label
                            htmlFor="nextStatus"
                            className="block text-sm font-semibold text-yambo-black mb-1.5"
                        >
                            Cambiar estado (opcional)
                        </label>
                        <select
                            id="nextStatus"
                            value={nextStatus}
                            onChange={(event) =>
                                setNextStatus(
                                    event.target.value as IssueStatus | "",
                                )
                            }
                            disabled={loading}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-400 bg-white transition-all"
                        >
                            <option value="">Sin cambio</option>
                            {allowedTransitions.map((status) => (
                                <option key={status} value={status}>
                                    {ISSUE_STATUS_CONFIG[status].label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <p>
                        Todo cambio de estado debe ir acompañado de comentario.
                    </p>
                    <p>
                        {text.length}/{maxLength}
                    </p>
                </div>

                <div className="flex justify-end gap-2">
                    <ButtonComponent
                        type="button"
                        onClick={() => {
                            setText("");
                            setResetKey((k) => k + 1);
                        }}
                        disabled={loading || text.length === 0}
                        variant="neutral"
                    >
                        Limpiar
                    </ButtonComponent>
                    <ButtonComponent
                        type="submit"
                        isLoading={loading}
                        variant="primary"
                    >
                        {loading ? "Enviando..." : "Publicar comentario"}
                    </ButtonComponent>
                </div>
            </form>
        </div>
    );
};
