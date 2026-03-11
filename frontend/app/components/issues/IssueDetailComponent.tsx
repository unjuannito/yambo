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
        return <div className="text-center py-8 text-gray-400">Cargando...</div>;
    }

    if (error && !issue) {
        return <ErrorMessage message={error} onRetry={loadIssue} />;
    }

    if (!issue) {
        return <div className="text-center py-8 text-gray-400">Incidencia no encontrada</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                            Incidencia #{issue.id}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-extrabold font-display text-yambo-black break-words">
                            {issue.title}
                        </h1>
                        <p className="text-sm text-gray-400 mt-2">
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
                    <span className="text-sm text-gray-400">
                        {issue.comments?.length ?? 0} comentarios
                    </span>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-3">
                            Descripción
                        </h2>
                        <MarkdownEditor value={issue.description} readOnly />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
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
                                        className={`rounded-2xl p-4 border ${
                                            comment.status
                                                ? "bg-yambo-green-50/30 border-yambo-green-200"
                                                : "bg-gray-50/50 border-gray-100"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                    {String(
                                                        comment.userName ||
                                                            comment.userId ||
                                                            "U",
                                                    )
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                                <span className="font-semibold text-yambo-black truncate">
                                                    {comment.userName ||
                                                        "Usuario"}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 shrink-0">
                                                {formatDate(comment.createdAt)}
                                            </span>
                                        </div>
                                        {comment.status && (
                                            <div className="mb-2">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ISSUE_STATUS_CONFIG[comment.status].className}`}
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
                                <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                                    Sin comentarios aún
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-sm font-bold font-display text-yambo-black mb-3">
                            Datos de incidencia
                        </h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-400">ID</dt>
                                <dd className="font-semibold text-yambo-black break-all text-right">
                                    {issue.id}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-400">Creación</dt>
                                <dd className="font-semibold text-yambo-black text-right">
                                    {formatDate(issue.createdAt)}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                                <dt className="text-gray-400">
                                    Última actualización
                                </dt>
                                <dd className="font-semibold text-yambo-black text-right">
                                    {formatDate(issue.updatedAt)}
                                </dd>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <dt className="text-gray-400 mb-1">
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
                                                    className="rounded-xl bg-yambo-green-50/30 border border-gray-100 p-2.5"
                                                >
                                                    <p className="text-xs font-semibold text-yambo-black">
                                                        {product.familyProductName
                                                            ? `${product.familyProductName} · `
                                                            : ""}
                                                        {product.productName ||
                                                            product.productId ||
                                                            "Producto"}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        ID:{" "}
                                                        <span className="font-mono">
                                                            {
                                                                product.orderedProductId
                                                            }
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Cantidad:{" "}
                                                        {product.quantity ?? 1}
                                                        {product.unitPrice
                                                            ? ` · ${Number(product.unitPrice).toFixed(2)} €`
                                                            : ""}
                                                    </p>
                                                    {product.configuration &&
                                                        product.configuration !==
                                                            "{}" && (
                                                            <p className="text-xs text-gray-400 mt-0.5">
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
                                                    className="inline-block px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-mono"
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
