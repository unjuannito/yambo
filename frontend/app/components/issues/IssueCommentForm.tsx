import React, { useState } from "react";
import { issueService } from "~/services/issueService";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
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
                setError("El comentario es obligatorio");
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
        <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200">
            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit}>
                <div className="mb-2">
                    <label
                        htmlFor="comment"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Añadir comentario
                    </label>
                    <textarea
                        id="comment"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Escribe una actualización clara sobre la incidencia"
                        rows={4}
                        maxLength={maxLength}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        disabled={loading}
                    />
                </div>

                {canUpdateStatus && (
                    <div className="mb-3">
                        <label
                            htmlFor="nextStatus"
                            className="block text-sm font-medium text-gray-700 mb-1"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
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
                        onClick={() => setText("")}
                        disabled={loading || text.length === 0}
                        variant="neutral"
                    >
                        Limpiar
                    </ButtonComponent>
                    <ButtonComponent
                        type="submit"
                        loading={loading}
                        variant="primary"
                    >
                        {loading ? "Enviando..." : "Publicar comentario"}
                    </ButtonComponent>
                </div>
            </form>
        </div>
    );
};
