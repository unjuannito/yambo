import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import type { IssueDetail, IssueComment, IssueWatcher } from "~/types/issueType";
import { ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { issueService } from "~/services/issueService";
import { orderService } from "~/services/orderService";
import type { OrderProduct } from "~/services/orderService";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { IssueCommentForm } from "./IssueCommentForm";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { WatcherManager } from "~/components/common/WatcherManager";
import { getErrorMessage } from "~/types/error";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import {
    getIssueOrderedProductIds,
    formatConfiguration,
} from "~/utils/issueUtils";

interface IssueDetailComponentProps {
    issueId: string;
    isAdmin?: boolean;
}

export const IssueDetailComponent: React.FC<IssueDetailComponentProps> = ({
    issueId,
    isAdmin = false,
}) => {
    const [issue, setIssue] = useState<IssueDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [watchers, setWatchers] = useState<IssueWatcher[]>([]);
    const [watchersLoading, setWatchersLoading] = useState(false);
    const [relatedOrderId, setRelatedOrderId] = useState<string | null>(null);
    const [editingProducts, setEditingProducts] = useState(false);
    const [orderAllProducts, setOrderAllProducts] = useState<OrderProduct[]>([]);
    const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
    const [savingProducts, setSavingProducts] = useState(false);
    const [productsError, setProductsError] = useState<string | null>(null);

    const loadIssue = async () => {
        try {
            setLoading(true);
            const [data, issueList] = await Promise.all([
                issueService.getIssue(issueId),
                issueService
                    .getAllIssues(0, 1, undefined, undefined, undefined, undefined, issueId)
                    .catch(() => null),
            ]);
            setIssue(data);
            setRelatedOrderId(issueList?.content?.[0]?.orderId || null);
            setError(null);
        } catch (err) {
            setError(
                getErrorMessage(err, "Error al cargar la incidencia"),
            );
            setRelatedOrderId(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssue();
    }, [issueId]);

    useEffect(() => {
        if (!isAdmin) return;
        setWatchersLoading(true);
        issueService.getWatchers(issueId)
            .then(setWatchers)
            .catch(() => {})
            .finally(() => setWatchersLoading(false));
    }, [issueId, isAdmin]);

    const startEditProducts = async () => {
        if (!relatedOrderId || !issue) return;
        setProductsError(null);
        try {
            const order = await orderService.getOrder(relatedOrderId);
            setOrderAllProducts(order.products);
            setEditSelectedIds(
                issue.relatedProducts && issue.relatedProducts.length > 0
                    ? issue.relatedProducts.map((p) => p.orderedProductId)
                    : getIssueOrderedProductIds(issue)
            );
            setEditingProducts(true);
        } catch (err) {
            setProductsError(getErrorMessage(err, "Error al cargar los productos del pedido"));
        }
    };

    const cancelEditProducts = () => {
        setEditingProducts(false);
        setProductsError(null);
    };

    const saveProductUpdates = async () => {
        if (editSelectedIds.length === 0) {
            setProductsError("Selecciona al menos un producto");
            return;
        }
        setSavingProducts(true);
        setProductsError(null);
        try {
            await issueService.updateIssueProducts(issueId, editSelectedIds);
            setEditingProducts(false);
            await loadIssue();
        } catch (err) {
            setProductsError(getErrorMessage(err, "Error al actualizar los productos"));
        } finally {
            setSavingProducts(false);
        }
    };

    const toggleEditProduct = (productId: string) => {
        setEditSelectedIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-400">Cargando...</div>;
    }

    if (error && !issue) {
        return <ErrorMessage message={error} onRetry={loadIssue} />;
    }

    if (!issue) {
        return <div className="text-center py-8 text-gray-400">Incidencia no encontrada</div>;
    }

    const relatedProductCount = issue.relatedProducts?.length ?? getIssueOrderedProductIds(issue).length;
    const commentCount = issue.comments?.length ?? 0;

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-yambo-green-50/40 px-4 py-3 md:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-1.5">
                                Issue workspace
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                                <span className="font-semibold text-yambo-black">Incidencias</span>
                                <span>/</span>
                                <span className="font-mono text-xs">{issue.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-4 md:px-5 md:py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-400 mb-1">
                                Ticket #{issue.id}
                            </p>
                            <h1 className="text-xl md:text-2xl font-extrabold font-display text-yambo-black break-words leading-tight">
                                {issue.title}
                            </h1>
                            <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-3xl">
                                Registro creado el {formatDate(issue.createdAt)} y actualizado por última vez el {formatDate(issue.updatedAt)}.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <IssueStatusBadge status={issue.status} />
                            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500">
                                <span className="font-semibold text-yambo-black">{commentCount}</span> actividad
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="rounded-xl border border-gray-100 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Estado</p>
                            <p className="text-xs font-semibold text-yambo-black">{ISSUE_STATUS_CONFIG[issue.status].label}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Productos</p>
                            <p className="text-xs font-semibold text-yambo-black">{relatedProductCount} vinculados</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Seguimiento</p>
                            <p className="text-xs font-semibold text-yambo-black">{watchers.length} seguidores</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Creación</p>
                            <p className="text-xs font-semibold text-yambo-black">{formatDate(issue.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4 items-start">
                <section className="space-y-4 min-w-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Resumen</p>
                                <h2 className="text-lg font-bold font-display text-yambo-black">Descripción</h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                                Visible para soporte
                            </span>
                        </div>
                        <MarkdownEditor value={issue.description} readOnly />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Actividad</p>
                                <h2 className="text-lg font-bold font-display text-yambo-black">Comentarios y cambios</h2>
                            </div>
                            <span className="text-xs text-gray-400">{commentCount} eventos registrados</span>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-3 md:p-4 mb-4">
                            <p className="text-sm font-semibold text-yambo-black mb-2">Añadir actualización</p>
                            <IssueCommentForm
                                issueId={issueId}
                                currentStatus={issue.status}
                                canUpdateStatus={isAdmin}
                                onSuccess={loadIssue}
                            />
                        </div>

                        <div className="space-y-3">
                            {issue.comments && issue.comments.length > 0 ? (
                                issue.comments.map((comment: IssueComment) => (
                                    <article
                                        key={comment.id}
                                        className="relative pl-5"
                                    >
                                        <span className="absolute left-[0.7rem] top-10 bottom-0 w-px bg-gray-200 last:hidden" />
                                        <div className={`rounded-xl p-3.5 md:p-4 border ${
                                            comment.status
                                                ? "bg-yambo-green-50/40 border-yambo-green-200"
                                                : "bg-white border-gray-100"
                                        }`}>
                                            <div className="flex items-start justify-between gap-2 mb-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="absolute left-0 top-4 h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                        {String(comment.userName || comment.userId || "U").charAt(0).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-yambo-black truncate">
                                                            {comment.userName || "Usuario"}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400">
                                                            {formatDate(comment.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {comment.status && (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${ISSUE_STATUS_CONFIG[comment.status].className}`}>
                                                        Estado: {ISSUE_STATUS_CONFIG[comment.status].label}
                                                    </span>
                                                )}
                                            </div>
                                            <MarkdownEditor value={comment.text || ""} readOnly />
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400 bg-slate-50/60">
                                    Sin actividad aún
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="space-y-4 xl:sticky xl:top-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Details</p>
                        <h3 className="text-base font-bold font-display text-yambo-black mb-2.5">Datos de incidencia</h3>
                        <dl className="divide-y divide-gray-100 text-sm">
                            <div className="flex items-start justify-between gap-3 py-2 first:pt-0">
                                <dt className="text-xs text-gray-400">Clave</dt>
                                <dd className="text-xs font-mono font-semibold text-yambo-black text-right break-all">{issue.id}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">Estado</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{ISSUE_STATUS_CONFIG[issue.status].label}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">Creación</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{formatDate(issue.createdAt)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">Última actualización</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{formatDate(issue.updatedAt)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2 pb-0">
                                <dt className="text-xs text-gray-400">Actividad</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{commentCount} comentarios</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Context</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                            <h3 className="text-base font-bold font-display text-yambo-black">Productos relacionados</h3>
                            <div className="flex items-center gap-2">
                                {relatedOrderId && (
                                    <Link
                                        to={isAdmin ? `/mi-espacio/admin/pedidos?orderId=${relatedOrderId}` : `/mi-espacio/mis-pedidos?orderId=${relatedOrderId}`}
                                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-yambo-green-700 hover:bg-yambo-green-50 transition-colors"
                                    >
                                        Ver pedido #{relatedOrderId}
                                    </Link>
                                )}
                                {isAdmin && relatedOrderId && !editingProducts && (
                                    <button
                                        onClick={startEditProducts}
                                        className="inline-flex items-center rounded-full border border-yambo-green-200 bg-yambo-green-50 px-2.5 py-1 text-[11px] font-semibold text-yambo-green-700 hover:bg-yambo-green-100 transition-colors"
                                    >
                                        Editar
                                    </button>
                                )}
                            </div>
                        </div>

                        {productsError && <p className="text-xs text-red-500 mb-2">{productsError}</p>}

                        {editingProducts ? (
                            <div>
                                <div className="border border-gray-200 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 mb-3">
                                    {orderAllProducts.map((product) => {
                                        const checked = editSelectedIds.includes(product.id);
                                        return (
                                            <label
                                                key={product.id}
                                                className="flex items-start gap-2.5 text-sm text-gray-600 hover:bg-yambo-green-50/30 rounded-lg p-1.5 transition-colors cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleEditProduct(product.id)}
                                                    disabled={savingProducts}
                                                    className="w-4 h-4 mt-0.5 text-yambo-green-500 rounded accent-yambo-green-500"
                                                />
                                                <span>
                                                    <span className="block text-xs font-semibold text-yambo-black">
                                                        {product.productName || product.productId}
                                                    </span>
                                                    <span className="block text-[11px] text-gray-400">
                                                        Cant. {product.quantity}
                                                        {typeof product.price === "number" ? ` · ${product.price.toFixed(2)} €` : ""}
                                                    </span>
                                                    {product.configuration && product.configuration !== "{}" && (
                                                        <span className="block text-[11px] text-gray-400">
                                                            {formatConfiguration(product.configuration)}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-gray-400 mb-3">{editSelectedIds.length} seleccionados</p>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={cancelEditProducts}
                                        disabled={savingProducts}
                                        className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveProductUpdates}
                                        disabled={savingProducts || editSelectedIds.length === 0}
                                        className="px-3 py-1.5 rounded-xl bg-yambo-green-500 text-xs font-semibold text-white hover:bg-yambo-green-600 transition-colors disabled:opacity-50"
                                    >
                                        {savingProducts ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </div>
                        ) : issue.relatedProducts && issue.relatedProducts.length > 0 ? (
                            <div className="space-y-2">
                                {issue.relatedProducts.map((product) => (
                                    <div
                                        key={product.orderedProductId}
                                        className="rounded-xl bg-slate-50 border border-gray-100 p-2.5"
                                    >
                                        <p className="text-xs font-semibold text-yambo-black">
                                            {product.familyProductName ? `${product.familyProductName} · ` : ""}
                                            {product.productName || product.productId || "Producto"}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            ID <span className="font-mono">{product.orderedProductId}</span>
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            Cantidad {product.quantity ?? 1}
                                            {product.unitPrice ? ` · ${Number(product.unitPrice).toFixed(2)} €` : ""}
                                        </p>
                                        {product.configuration && product.configuration !== "{}" && (
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                Configuración: {formatConfiguration(product.configuration)}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {getIssueOrderedProductIds(issue).map((orderedProductId) => (
                                    <span
                                        key={orderedProductId}
                                        className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-gray-600 text-[11px] font-mono"
                                    >
                                        {orderedProductId}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">Collaboration</p>
                            <h3 className="text-base font-bold font-display text-yambo-black mb-2.5">Seguidores</h3>
                            <WatcherManager
                                watchers={watchers}
                                loading={watchersLoading}
                                onAdd={async (email, userId) => {
                                    const created = await issueService.addWatcher(issueId, email, userId);
                                    setWatchers((prev) => [...prev, created]);
                                }}
                                onRemove={async (email) => {
                                    await issueService.removeWatcher(issueId, email);
                                    setWatchers((prev) => prev.filter((w) => w.email !== email));
                                }}
                            />
                        </div>
                    )}
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
