import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";
import type { DashboardOrder } from "~/hooks/useDashboardData";

const OrderRow = React.memo(function OrderRow({ order }: { order: DashboardOrder }) {
    const statusConfig =
        ORDER_STATUS_CONFIG[
            order.status as keyof typeof ORDER_STATUS_CONFIG
        ];

    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-yambo-green-50/30 transition-colors rounded-xl mx-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yambo-black truncate">
                    {order.products.length}{" "}
                    {order.products.length === 1
                        ? "producto"
                        : "productos"}
                </p>
                <p className="text-xs text-gray-400">
                    {formatDate(order.createdAt)}
                </p>
            </div>

            <div className="flex items-center gap-2.5">
                {order.hasOpenIssues && (
                    <span title="Tiene incidencias abiertas">
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

export default function RecentOrdersList({ orders }: RecentOrdersListProps) {
    if (orders.length === 0) {
        return (
            <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                    Pedidos recientes
                </h2>
                <p className="text-gray-400 text-sm">
                    Aún no tienes pedidos.{" "}
                    <Link
                        to="/mi-espacio/merch"
                        className="text-yambo-green-600 hover:text-yambo-green-700 font-semibold transition-colors"
                    >
                        Explora la tienda
                    </Link>
                </p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <h2 className="text-lg font-bold font-display text-yambo-black">
                    Pedidos recientes
                </h2>
                <Link
                    to="/mi-espacio/mis-pedidos"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                    Ver todos
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-gray-50 pb-2">
                {orders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                ))}
            </div>
        </section>
    );
}
