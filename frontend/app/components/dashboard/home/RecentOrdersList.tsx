import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRight,
    faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";
import type { Order } from "~/services/orderService";

interface RecentOrdersListProps {
    orders: Order[];
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
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                    Pedidos recientes
                </h2>
                <p className="text-gray-500 text-sm">
                    Aún no tienes pedidos.{" "}
                    <Link
                        to="/mi-espacio/merch"
                        className="text-blue-600 hover:underline"
                    >
                        Explora la tienda
                    </Link>
                </p>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-semibold text-gray-700">
                    Pedidos recientes
                </h2>
                <Link
                    to="/mi-espacio/mis-pedidos"
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    Ver todos
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-gray-100">
                {orders.map((order) => {
                    const statusConfig =
                        ORDER_STATUS_CONFIG[
                            order.status as keyof typeof ORDER_STATUS_CONFIG
                        ];

                    return (
                        <div
                            key={order.id}
                            className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {order.products.length}{" "}
                                    {order.products.length === 1
                                        ? "producto"
                                        : "productos"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatDate(order.createdAt)}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {order.hasOpenIssues && (
                                    <span title="Tiene incidencias abiertas">
                                        <FontAwesomeIcon
                                            icon={faCircleExclamation}
                                            className="w-4 h-4 text-red-500"
                                        />
                                    </span>
                                )}
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        statusConfig?.className ??
                                        "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                    {statusConfig?.shortLabel ?? order.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
