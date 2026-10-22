import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import toast from "react-hot-toast";
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
    const { t } = useTranslation();
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
                getErrorMessage(err, t('issues.title')),
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
        if (!isAdmin) {
            setWatchers([]);
            setWatchersLoading(false);
            return;
        }
        setWatchers([]);
        setWatchersLoading(true);
        issueService.getWatchers(issueId)
            .then(setWatchers)
            .catch(() => {
                setWatchers([]);
            })
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
            setProductsError(getErrorMessage(err, t('issues.title')));
        }
    };

    const cancelEditProducts = () => {
        setEditingProducts(false);
        setProductsError(null);
    };

    const saveProductUpdates = async () => {
        if (editSelectedIds.length === 0) {
            setProductsError(t('common.required'));
            return;
        }
        setSavingProducts(true);
        setProductsError(null);
        try {
            await issueService.updateIssueProducts(issueId, editSelectedIds);
            setEditingProducts(false);
            await loadIssue();
            toast.success(t('issues.updated') || "Incidencia actualizada correctamente");
        } catch (err) {
            const message = getErrorMessage(err, t('issues.title'));
            toast.error(message);
            setProductsError(message);
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
        return <div className="text-center py-8 text-gray-400">{t('issues.loading')}</div>;
    }

    if (error && !issue) {
        return <ErrorMessage message={error} onRetry={loadIssue} />;
    }

    if (!issue) {
        return <div className="text-center py-8 text-gray-400">{t('issues.title')}</div>;
    }

    const commentCount = issue.comments?.length ?? 0;

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-yambo-green-50/40 px-4 py-3 md:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1 text-m text-gray-500">
                                <span className="font-semibold text-yambo-black">{t('issues.title')}</span>
                                <span>/</span>
                                <span className="font-mono">{issue.id}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-4 md:px-5 md:py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl md:text-2xl font-extrabold font-display text-yambo-black break-words leading-tight">
                                {issue.title}
                            </h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <IssueStatusBadge status={issue.status} />
                            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500">
                                <span className="font-semibold text-yambo-black">{commentCount}</span> {t('common.activities') || "actividad"}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-4 items-start">
                <section className="space-y-4 min-w-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">{t('issues.description')}</p>
                                <h2 className="text-lg font-bold font-display text-yambo-black">{t('issues.description')}</h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                                {t('common.view')}
                            </span>
                        </div>
                        <MarkdownEditor value={issue.description} readOnly />
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">

                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                                <h2 className="text-lg font-bold font-display text-yambo-black">{t('common.activities') || "Actividad"}</h2>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
                                {t('common.view')}
                            </span>
                        </div>
                        <div className="space-y-3">
                            
                            {issue.comments && issue.comments.length > 0 ? (
                                issue.comments.map((comment: IssueComment) => (
                                    <article
                                        key={comment.id}
                                        className="relative pl-5"
                                    >
                                        <span className="absolute left-[0.7rem] top-2 bottom-0 w-px bg-gray-200 last:hidden" />
                                        <div className={`rounded-xl p-3.5 md:p-4 border ${
                                            comment.status
                                                ? "bg-yambo-green-50/40 border-yambo-green-200"
                                                : "bg-white border-gray-100"
                                        }`}>
                                            <div className="flex items-start justify-between gap-1 mb-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="absolute left-0 top-4 h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-yambo-green-400 to-yambo-green-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                        {String(comment.userName || comment.userId || "U").charAt(0).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-yambo-black truncate">
                                                            {comment.userName || t('common.user') || "Usuario"}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400">
                                                            {formatDate(comment.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {comment.status && (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold ${ISSUE_STATUS_CONFIG[comment.status].className}`}>
                                                        {t('issues.status')}: {ISSUE_STATUS_CONFIG[comment.status].label}
                                                    </span>
                                                )}
                                            </div>
                                            <MarkdownEditor value={comment.text || ""} readOnly className="p-0"  />
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400 bg-slate-50/60">
                                    {t('common.noData')}
                                </div>
                            )}
                        </div>
                        </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">{t('common.activities') || "Actividad"}</p>
                                <h2 className="text-lg font-bold font-display text-yambo-black">{t('issues.title')}</h2>
                            </div>
                            <span className="text-xs text-gray-400">{commentCount} {t('common.events') || "eventos registrados"}</span>
                        </div>

                        <IssueCommentForm
                            issueId={issueId}
                            currentStatus={issue.status}
                            canUpdateStatus={isAdmin}
                            onSuccess={loadIssue}
                        />

                        
                    </div>
                </section>

                <aside className="space-y-4 lg:sticky lg:top-20">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">{t('common.details') || "Detalles"}</p>
                        <h3 className="text-base font-bold font-display text-yambo-black mb-2.5">{t('issues.title')}</h3>
                        <dl className="divide-y divide-gray-100 text-sm">
                            <div className="flex items-start justify-between gap-3 py-2 first:pt-0">
                                <dt className="text-xs text-gray-400">{t('common.id')}</dt>
                                <dd className="text-xs font-mono font-semibold text-yambo-black text-right break-all">{issue.id}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">{t('issues.status')}</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{ISSUE_STATUS_CONFIG[issue.status].label}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">{t('issues.createdAt')}</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{formatDate(issue.createdAt)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-xs text-gray-400">{t('issues.updatedAt')}</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{formatDate(issue.updatedAt)}</dd>
                            </div>
                            <div className="flex items-start justify-between gap-3 py-2 pb-0">
                                <dt className="text-xs text-gray-400">{t('common.activities') || "Actividad"}</dt>
                                <dd className="text-xs font-semibold text-yambo-black text-right">{commentCount} {t('comments') || "comentarios"}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">{t('common.context') || "Contexto"}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                            <h3 className="text-base font-bold font-display text-yambo-black">{t('orders.product')}</h3>
                            <div className="flex items-center gap-2">
                                {relatedOrderId && (
                                    <Link
                                        to={isAdmin ? `/mi-espacio/admin/pedidos?orderId=${relatedOrderId}` : `/mi-espacio/mis-pedidos?orderId=${relatedOrderId}`}
                                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-yambo-green-700 hover:bg-yambo-green-50 transition-colors"
                                    >
                                        {t('orders.viewOrder')} #{relatedOrderId}
                                    </Link>
                                )}
                                {isAdmin && relatedOrderId && !editingProducts && (
                                    <button type="button"
                                        onClick={startEditProducts}
                                        className="inline-flex items-center rounded-full border border-yambo-green-200 bg-yambo-green-50 px-2.5 py-1 text-[11px] font-semibold text-yambo-green-700 hover:bg-yambo-green-100 transition-colors"
                                    >
                                        {t('common.edit')}
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
                                                        {t('orders.quantity')} {product.quantity}
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
                                <p className="text-[11px] text-gray-400 mb-3">{editSelectedIds.length} {t('common.selected') || "seleccionados"}</p>
                                <div className="flex gap-2 justify-end">
                                    <button type="button"
                                        onClick={cancelEditProducts}
                                        disabled={savingProducts}
                                        className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button type="button"
                                        onClick={saveProductUpdates}
                                        disabled={savingProducts || editSelectedIds.length === 0}
                                        className="px-3 py-1.5 rounded-xl bg-yambo-green-500 text-xs font-semibold text-white hover:bg-yambo-green-600 transition-colors disabled:opacity-50"
                                    >
                                        {savingProducts ? t('common.saving') : t('common.save')}
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
                                            {product.productName || product.productId || t('orders.product')}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {t('common.id')} <span className="font-mono">{product.orderedProductId}</span>
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {t('orders.quantity')} {product.quantity ?? 1}
                                            {product.unitPrice ? ` · ${Number(product.unitPrice).toFixed(2)} €` : ""}
                                        </p>
                                        {product.configuration && product.configuration !== "{}" && (
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {t('orders.configuration')} {formatConfiguration(product.configuration)}
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
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-0.5">{t('common.collaboration') || "Colaboración"}</p>
                            <h3 className="text-base font-bold font-display text-yambo-black mb-2.5">{t('common.followers') || "Seguidores"}</h3>
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
