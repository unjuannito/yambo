import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { IssueDetail, IssueWatcher } from "~/types/issueType";
import { WatcherManager } from "~/components/common/WatcherManager";
import { getIssueOrderedProductIds, formatConfiguration } from "~/utils/issueUtils";
import type { OrderProduct } from "~/services/orderService";

interface IssueSidebarInfoProps {
    issue: IssueDetail;
    isAdmin: boolean;
    relatedOrderId: string | null;
    watchers: IssueWatcher[];
    loadingWatchers: boolean;
    // Edición de productos relacionados
    editingProducts: boolean;
    orderAllProducts: OrderProduct[];
    editSelectedIds: string[];
    savingProducts: boolean;
    productsError: string | null;
    onStartEditProducts: () => void;
    onToggleEditProduct: (id: string) => void;
    onSaveProducts: () => void;
    onCancelEditProducts: () => void;
    onAddWatcher: (email: string, userId?: string) => Promise<void>;
    onRemoveWatcher: (email: string) => Promise<void>;
}

export const IssueSidebarInfo: React.FC<IssueSidebarInfoProps> = ({
    issue,
    isAdmin,
    relatedOrderId,
    watchers,
    loadingWatchers,
    editingProducts,
    orderAllProducts,
    editSelectedIds,
    savingProducts,
    productsError,
    onStartEditProducts,
    onToggleEditProduct,
    onSaveProducts,
    onCancelEditProducts,
    onAddWatcher,
    onRemoveWatcher,
}) => {
    const { t } = useTranslation();
    const products = issue.relatedProducts?.length 
        ? issue.relatedProducts 
        : getIssueOrderedProductIds(issue).map(id => ({ orderedProductId: id }));

    return (
        <div className="space-y-6 pb-20 lg:pb-0">
            <div className="bg-white rounded-[24px] shadow-sm border-2 border-slate-200 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-extrabold text-yambo-black tracking-tight">{t('orders.product')}</h3>
                    <div className="flex items-center gap-2">
                        {relatedOrderId && (
                            <Link
                                to={(isAdmin ? `/mi-espacio/admin/pedidos` : `/mi-espacio/mis-pedidos`) + `?orderId=${relatedOrderId}`}
                                className="text-[10px] font-bold text-yambo-green-700 bg-yambo-green-50 hover:bg-yambo-green-100 px-2.5 py-1 rounded-full transition-colors border border-yambo-green-100"
                            >
                                {t('orders.orderNumber')} #{relatedOrderId}
                            </Link>
                        )}
                        {isAdmin && relatedOrderId && !editingProducts && (
                            <button
                                type="button"
                                onClick={onStartEditProducts}
                                className="text-[10px] font-bold text-yambo-green-700 bg-yambo-green-50 hover:bg-yambo-green-100 px-2.5 py-1 rounded-full transition-colors border border-yambo-green-200"
                            >
                                {t('common.edit')}
                            </button>
                        )}
                    </div>
                </div>

                {productsError && <p className="text-xs text-red-500 mb-2">{productsError}</p>}

                {editingProducts ? (
                    <div>
                        <div className="border-2 border-slate-200 rounded-2xl p-3 max-h-56 overflow-y-auto space-y-2 mb-3">
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
                                            onChange={() => onToggleEditProduct(product.id)}
                                            disabled={savingProducts}
                                            className="w-4 h-4 mt-0.5 accent-yambo-green-500"
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
                                                <span className="block text-[11px] text-gray-400 italic">
                                                    {formatConfiguration(product.configuration)}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-gray-400 mb-3">
                            {editSelectedIds.length} {t('common.selected') || "seleccionados"}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={onCancelEditProducts}
                                disabled={savingProducts}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onSaveProducts}
                                disabled={savingProducts || editSelectedIds.length === 0}
                                className="px-3 py-1.5 rounded-xl bg-yambo-green-500 text-xs font-semibold text-white hover:bg-yambo-green-600 transition-colors disabled:opacity-50"
                            >
                                {savingProducts ? t('common.saving') : t('common.save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {products.map((p: any) => (
                            <div key={p.orderedProductId} className="rounded-2xl bg-slate-50/50 border-2 border-slate-100 p-3.5 text-[11px] transition-colors hover:bg-slate-50">
                                <p className="font-bold text-yambo-black mb-1">{p.productName || p.orderedProductId}</p>
                                <div className="flex flex-col gap-0.5 text-gray-500">
                                    {p.quantity && <p>{t('orders.quantity')}: <span className="font-medium text-gray-700">{p.quantity}</span></p>}
                                    {p.configuration && p.configuration !== "{}" && <p className="italic text-gray-400 mt-1">{formatConfiguration(p.configuration)}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAdmin && (
                <menu className="bg-white rounded-[24px] shadow-sm border-2 border-slate-200 p-5 transition-shadow hover:shadow-md">
                    <h3 className="text-sm font-extrabold text-yambo-black tracking-tight mb-4">{t('common.followers') || "Seguidores"}</h3>
                    <WatcherManager watchers={watchers} loading={loadingWatchers} onAdd={onAddWatcher} onRemove={onRemoveWatcher} />
                </menu>
            )}
        </div>
    );
};
