import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { IssueDetail, IssueWatcher } from "~/types/issueType";
import { WatcherManager } from "~/components/common/WatcherManager";
import { getIssueOrderedProductIds, formatConfiguration } from "~/utils/issueUtils";

interface IssueSidebarInfoProps {
    issue: IssueDetail;
    isAdmin: boolean;
    relatedOrderId: string | null;
    watchers: IssueWatcher[];
    loadingWatchers: boolean;
    onUpdateProducts: () => void;
    onAddWatcher: (email: string, userId?: string) => Promise<void>;
    onRemoveWatcher: (email: string) => Promise<void>;
}

export const IssueSidebarInfo: React.FC<IssueSidebarInfoProps> = ({
    issue,
    isAdmin,
    relatedOrderId,
    watchers,
    loadingWatchers,
    onUpdateProducts,
    onAddWatcher,
    onRemoveWatcher
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
                    {relatedOrderId && (
                        <Link
                            to={(isAdmin ? `/mi-espacio/admin/pedidos` : `/mi-espacio/mis-pedidos`) + `?orderId=${relatedOrderId}`}
                            className="text-[10px] font-bold text-yambo-green-700 bg-yambo-green-50 hover:bg-yambo-green-100 px-2.5 py-1 rounded-full transition-colors border border-yambo-green-100"
                        >
                            {t('orders.orderNumber')} #{relatedOrderId}
                        </Link>
                    )}
                </div>
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
