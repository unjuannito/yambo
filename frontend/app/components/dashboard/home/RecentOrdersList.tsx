import { Link } from "react-router";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faCircleExclamation,
    faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";
import type { DashboardOrder } from "~/hooks/useDashboardData";

const OrderRow = React.memo(function OrderRow({ order }: { order: DashboardOrder }) {
    const { t } = useTranslation();
    const statusConfig =
        ORDER_STATUS_CONFIG[
            order.status as keyof typeof ORDER_STATUS_CONFIG
        ];

    return (
        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-yambo-green-50/30 transition-colors rounded-xl mx-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yambo-black truncate">
                    {order.products.length} {t('orders.product')}{order.products.length !== 1 ? "s" : ""}
                    {order.user && (
                        <span className="text-gray-400 font-normal">
                            {' · '}
                            <Link
                                to={`/mi-espacio/admin/usuarios/${order.user.id}/perfil`}
                                className="hover:text-yambo-green-600 transition-colors"
                            >
                                {order.user.name}
                            </Link>
                        </span>
                    )}
                </p>
                <p className="text-xs text-gray-400">
                    #{order.id?.substring(0, 8)} · {formatDate(order.createdAt)}
                </p>
            </div>

            <div className="flex items-center gap-2.5">
                {order.hasOpenIssues && (
                    <span title={t('issues.open')}>
                        <FontAwesomeIcon
                            icon={faCircleExclamation}
                            className="w-4 h-4 text-coral"
                        />
                    </span>
                )}
                <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        statusConfig?.className ??
                        "bg-gray-100 text-gray-600"
                    }`}
                >
                    {statusConfig?.shortLabel ?? order.status}
                </span>
            </div>
        </div>
    );
});

interface RecentOrdersListProps {
    orders: DashboardOrder[];
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function matchesOrder(order: DashboardOrder, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
        order.id?.toLowerCase().includes(q) ||
        order.user?.name?.toLowerCase().includes(q) ||
        order.user?.email?.toLowerCase().includes(q) ||
        order.products.some((p) => p.productName?.toLowerCase().includes(q))
    );
}

export default function RecentOrdersList({ orders }: RecentOrdersListProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredOrders = useMemo(
        () => orders.filter((o) => matchesOrder(o, searchQuery)),
        [orders, searchQuery]
    );

    if (orders.length === 0) {
        return (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h2 className="text-sm font-bold font-display text-gray-500 uppercase tracking-wider mb-2">
                    {t('dashboard.recentOrders')}
                </h2>
                <p className="text-gray-400 text-sm">
                    {t('dashboard.noRecentOrders')}{" "}
                    <Link
                        to="/mi-espacio/articulos"
                        className="text-yambo-green-600 hover:text-yambo-green-700 font-semibold transition-colors"
                    >
                        {t('dashboard.exploreStore')}
                    </Link>
                </p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 pt-4 pb-2">
                <h2 className="text-sm font-bold font-display text-gray-500 uppercase tracking-wider">
                    {t('dashboard.recentOrders')}
                </h2>
                <Link
                    to="/mi-espacio/mis-pedidos"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
                >
                    {t('dashboard.viewAll')}
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            {/* Search */}
            <div className="relative px-4 pb-2">
                <FontAwesomeIcon icon={faSearch} className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('dashboard.searchOrders')}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-yambo-green-300 focus:bg-white transition-all placeholder:text-gray-400"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600 font-medium"
                    >
                        {t('dashboard.clear')}
                    </button>
                )}
            </div>

            <div className="divide-y divide-gray-50 pb-2">
                {filteredOrders.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">
                        {t('dashboard.noOrdersFound')}
                    </p>
                ) : (
                    filteredOrders.map((order) => (
                        <OrderRow key={order.id} order={order} />
                    ))
                )}
            </div>
        </section>
    );
}
