import React, { useState, useEffect } from "react";
import type { IssueDetail, IssueComment } from "~/types/issueType";
import { ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { issueService } from "~/services/issueService";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { IssueCommentForm } from "./IssueCommentForm";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import {
    getIssueOrderedProductIds,
    formatConfiguration,
} from "~/utils/issueUtils";

interface IssueDetailComponentProps {
    issueId: string;
    isAdmin?: boolean;
    onClose?: () => void;
}

export const IssueDetailComponent: React.FC<IssueDetailComponentProps> = ({
    issueId,
    isAdmin = false,
    onClose,
}) => {
    const [issue, setIssue] = useState<IssueDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIssue = async () => {
        try {
            setLoading(true);
            const data = await issueService.getIssue(issueId);
            setIssue(data);
            setError(null);
        } catch (err) {
            setError(
                getErrorMessage(err, "Error al cargar la incidencia"),
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssue();
    }, [issueId]);

    if (loading) {
        return <div className="text-center py-8">Cargando...</div>;
    }

    if (error && !issue) {
        return <ErrorMessage message={error} onRetry={loadIssue} />;
    }

    if (!issue) {
        return <div className="text-center py-8">Incidencia no encontrada</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <section className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                            Incidencia #{issue.id}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">
                            {issue.title}
                        </h1>
                        <p className="text-sm text-gray-600 mt-2">
                            Creada el {formatDate(issue.createdAt)}
                        </p>
                    </div>
                    {onClose && (
                        <ButtonComponent
                            onClick={onClose}
                            variant="neutral"
                            size="sm"
                            className="h-9 w-9 rounded-full p-0"
                            aria-label="Cerrar"
                        >
                            ✕
                        </ButtonComponent>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <IssueStatusBadge status={issue.status} />
                    <span className="text-sm text-gray-600">
                        {issue.comments?.length ?? 0} comentarios
                    </span>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">
                            Descripción
                        </h2>
                        <MarkdownEditor value={issue.description} readOnly />
                    </div>

                    <div className="bg-white rounded-2xl shadow p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Comentarios
                        </h2>

                        <IssueCommentForm
                            issueId={issueId}
                            currentStatus={issue.status}
                            canUpdateStatus={isAdmin}
                            onSuccess={loadIssue}
                        />

                        <div className="space-y-3">
                            {issue.comments && issue.comments.length > 0 ? (
                                issue.comments.map((comment: IssueComment) => (
                                    <article
                                        key={comment.id}
                                        className={`rounded-xl p-4 border ${
                                            comment.status
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                    {String(
                                                        comment.userName ||
                                                            comment.userId ||
                                                            "U",
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <span className="font-medium text-gray-800 truncate">
                                                    {comment.userName ||
                                                        "Usuario"}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 shrink-0">
                                                {formatDate(comment.createdAt)}
                                            </span>
                                        </div>
                                        {comment.status && (
                                            <div className="mb-2">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${ISSUE_STATUS_CONFIG[comment.status].className}`}
                                                >
                                                    Estado actualizado a{" "}
                                                    {
                                                        ISSUE_STATUS_CONFIG[
                                                            comment.status
                                                        ].label
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        <MarkdownEditor value={comment.text || ""} readOnly />
                                    </article>
                                ))
                            ) : (
                                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
                                    Sin comentarios aún
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="bg-white rounded-2xl shadow p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Datos de incidencia
                        </h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">ID</dt>
                                <dd className="font-medium text-gray-800 break-all text-right">
                                    {issue.id}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">Creación</dt>
                                <dd className="font-medium text-gray-800 text-right">
                                    {formatDate(issue.createdAt)}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-500">
                                    Última actualización
                                </dt>
                                <dd className="font-medium text-gray-800 text-right">
                                    {formatDate(issue.updatedAt)}
                                </dd>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-500 mb-1">
                                    Productos relacionados
                                </dt>
                                {issue.relatedProducts &&
                                issue.relatedProducts.length > 0 ? (
                                    <dd className="space-y-2">
                                        {issue.relatedProducts.map(
                                            (product) => (
                                                <div
                                                    key={
                                                        product.orderedProductId
                                                    }
                                                    className="rounded-lg bg-gray-50 border border-gray-200 p-2"
                                                >
                                                    <p className="text-xs font-semibold text-gray-800">
                                                        {product.familyProductName
                                                            ? `${product.familyProductName} · `
                                                            : ""}
                                                        {product.productName ||
                                                            product.productId ||
                                                            "Producto"}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        ID:{" "}
                                                        <span className="font-mono">
                                                            {
                                                                product.orderedProductId
                                                            }
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-0.5">
                                                        Cantidad:{" "}
                                                        {product.quantity ?? 1}
                                                        {product.unitPrice
                                                            ? ` · ${Number(product.unitPrice).toFixed(2)} €`
                                                            : ""}
                                                    </p>
                                                    {product.configuration &&
                                                        product.configuration !==
                                                            "{}" && (
                                                            <p className="text-xs text-gray-600 mt-0.5">
                                                                Configuración:{" "}
                                                                {formatConfiguration(
                                                                    product.configuration,
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            ),
                                        )}
                                    </dd>
                                ) : (
                                    <dd className="flex flex-wrap gap-1 justify-end">
                                        {getIssueOrderedProductIds(issue).map(
                                            (orderedProductId) => (
                                                <span
                                                    key={orderedProductId}
                                                    className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono"
                                                >
                                                    {orderedProductId}
                                                </span>
                                            ),
                                        )}
                                    </dd>
                                )}
                            </div>
                        </dl>
                    </div>
                </aside>
            </div>

            {error && (
                <div className="mt-4">
                    <ErrorMessage message={error} />
                </div>
            )}
        </div>
    );
};

function formatDate(date: string) {
    return new Date(date).toLocaleString("es-ES");
}
