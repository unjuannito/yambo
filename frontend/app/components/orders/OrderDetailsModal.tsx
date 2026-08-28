import { useState } from "react";
import type { Order } from "~/services/orderService";
import type { Product } from "~/services/productService";
import type { FamilyProduct } from "~/services/familyProductService";
import type { Issue } from "~/types/issueType";
import { getIssueOrderedProductIds } from "~/utils/issueUtils";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { IssueStatusBadge } from "~/components/issues/IssueStatusBadge";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { OrderHistoryModal } from "./OrderHistoryModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faFileArrowDown, faUpload, faPencil, faTrash, faHistory } from "@fortawesome/free-solid-svg-icons";

interface OrderDetailsModalProps {
    readonly order: Order;
    readonly receiptFileUrl: string | null;
    readonly isMerchAdmin: boolean;
    readonly products: Product[];
    readonly drops: FamilyProduct[];
    readonly selectedOrderIssues: Issue[];
    readonly onClose: () => void;
    readonly onStatusChange: (orderId: string, newStatus: string) => void;
    readonly onOrderUpdated: (order: Order) => void;
    readonly onUploadReceipt: (order: Order) => void;
    readonly onRequestCancel: (order: Order) => void;
    readonly onOpenIssueWindow: (order: Order, preselectedProductId?: string) => void;
    readonly onViewIssue: (issueId: string) => void;
    readonly canEdit?: boolean;
    readonly canDelete?: boolean;
    readonly onEdit?: (order: Order) => void;
    readonly onDelete?: (order: Order) => void;
}

export function OrderDetailsModal({
    order,
    receiptFileUrl,
    isMerchAdmin,
    products,
    drops,
    selectedOrderIssues,
    onClose,
    onStatusChange,
    onOrderUpdated,
    onUploadReceipt,
    onRequestCancel,
    onOpenIssueWindow,
    onViewIssue,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
}: OrderDetailsModalProps) {
    const [showHistory, setShowHistory] = useState(false);

    const formatConfiguration = (configStr: string) => {
        try {
            const config = JSON.parse(configStr);
            return Object.entries(config)
                .map(([key, value]) => {
                    if (
                        !value ||
                        (typeof value === "string" && value.trim() === "")
                    ) {
                        return null;
                    }
                    if (typeof value === "boolean") {
                        return value ? key : null;
                    }
                    return `${key}: ${value}`;
                })
                .filter(Boolean)
                .join(", ");
        } catch {
            return configStr;
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden bounce-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-yambo-green-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-extrabold font-display text-yambo-black">
                            Detalles del Pedido
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            ID:{" "}
                            <span className="font-mono">
                                {order.id}
                            </span>
                        </p>
                    </div>
                    <button type="button"
                        onClick={onClose}
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Order Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div>
                            <p className="text-sm text-gray-400">
                                Cliente
                            </p>
                            <p className="text-sm font-medium text-yambo-black">
                                {order.user?.name || "N/A"}
                            </p>
                            <p className="text-xs text-gray-400">
                                <a
                                    href={`mailto:${order.user?.email || ""}`}
                                >
                                    {order.user?.email || ""}
                                </a>
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">
                                Estado
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                {(() => {
                                    const transitions = ORDER_WORKFLOW_TRANSITIONS[order.status as OrderStatus] || [];
                                    const currentConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG];
                                    return canEdit && transitions.length > 0 ? (
                                        <select
                                            value={order.status}
                                            onChange={async (e) => {
                                                await onStatusChange(order.id, e.target.value);
                                                onOrderUpdated({ ...order, status: e.target.value });
                                            }}
                                            className={`text-sm font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${currentConfig?.className || "bg-gray-100 text-gray-800"}`}
                                        >
                                            <option value={order.status}>
                                                {currentConfig?.shortLabel || order.status}
                                            </option>
                                            {transitions.map((status) => {
                                                const cfg = ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG];
                                                return (
                                                    <option key={status} value={status}>
                                                        {cfg?.shortLabel || status}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    ) : (
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${currentConfig?.className || "bg-gray-100 text-gray-800"}`}
                                        >
                                            {currentConfig?.shortLabel || order.status}
                                        </span>
                                    );
                                })()}
                                {order.hasOpenIssues && (
                                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                                        Incidencias Pendientes
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">
                                Fecha de creación
                            </p>
                            <p className="text-sm font-medium text-yambo-black">
                                {new Date(
                                    order.createdAt,
                                ).toLocaleString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Receipt File */}
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <p className="text-sm text-gray-400 mb-2">Justificante de pago</p>
                            <div className="flex items-center gap-3">
                                {order.receiptFileId && receiptFileUrl && (
                                    <a
                                        href={receiptFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-yambo-green-50 text-yambo-green-700 rounded-xl hover:bg-yambo-green-100 transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faFileArrowDown} className="w-4 h-4" />
                                        Ver justificante
                                    </a>
                                )}
                                {canEdit && (
                                    <button type="button"
                                        onClick={() => onUploadReceipt(order)}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-yambo-green-50 text-yambo-green-700 rounded-xl hover:bg-yambo-green-100 transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                                        {order.receiptFileId ? "Reemplazar justificante" : "Subir justificante"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold font-display text-yambo-black">
                                Productos
                            </h3>
                            {isMerchAdmin && (
                                <button type="button"
                                    onClick={() => onOpenIssueWindow(order)}
                                    className="text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors"
                                >
                                    + Nueva incidencia (varios productos)
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                            {order.products &&
                            order.products.length > 0 ? (
                                order.products.map(
                                    (product, idx) => {
                                        const productData = products.find(p => p.id === product.productId);
                                        const productDrop = productData?.familyProductId
                                            ? drops.find(drop => drop.id === productData.familyProductId)
                                            : null;

                                        const productIssues = selectedOrderIssues.filter(
                                            issue => getIssueOrderedProductIds(issue).includes(product.id)
                                        );

                                        return (
                                            <div
                                                key={`${order.id}-${product.productId}-${idx}`}
                                                className="bg-gray-50/50 rounded-2xl p-4"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-yambo-black">
                                                            {product.productName ||
                                                                product.productId}
                                                        </p>
                                                        {productDrop && (
                                                            <div className="mt-1 mb-2">
                                                                <span className="inline-block bg-yambo-green-50 text-yambo-green-700 px-2.5 py-1 rounded-full font-medium text-xs">
                                                                    {productDrop.name}
                                                                </span>
                                                                {productDrop.endTms && (
                                                                    <span className="text-xs text-gray-400 ml-2">
                                                                        Disponible hasta: {new Date(productDrop.endTms).toLocaleDateString('es-ES', {
                                                                            day: 'numeric',
                                                                            month: 'long',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {product.configuration &&
                                                            product.configuration !==
                                                                "{}" && (
                                                                <p className="text-sm text-gray-400 mt-1">
                                                                    <span className="font-medium text-gray-500">
                                                                        Configuración:
                                                                    </span>{" "}
                                                                    {formatConfiguration(
                                                                        product.configuration,
                                                                    )}
                                                                </p>
                                                            )}
                                                        {productIssues.length > 0 && (
                                                            <div className="mt-2 flex flex-col gap-1">
                                                                {productIssues.map(issue => (
                                                                    <div key={issue.id} className="flex items-center gap-2">
                                                                        <IssueStatusBadge status={issue.status} />
                                                                        <span className="text-sm text-gray-700 flex-1 truncate">{issue.title}</span>
                                                                        <button type="button"
                                                                            onClick={() => onViewIssue(issue.id)}
                                                                            className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium transition-colors shrink-0"
                                                                        >
                                                                            Ver incidencia
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {isMerchAdmin && (
                                                            <div className="mt-2">
                                                                <ButtonComponent
                                                                    size="sm"
                                                                    variant="neutral"
                                                                    onClick={() => onOpenIssueWindow(order, product.id)}
                                                                >
                                                                    + Crear incidencia
                                                                </ButtonComponent>
                                                            </div>
                                                        )}
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-sm text-gray-400">
                                                        Precio unitario
                                                    </p>
                                                    <p className="font-bold text-yambo-green-600">
                                                        {product.price.toFixed(
                                                            2,
                                                        )}{" "}
                                                        €
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                                <p className="text-sm text-gray-400">
                                                    Cantidad:{" "}
                                                    <span className="font-medium text-yambo-black">
                                                        {
                                                            product.quantity
                                                        }
                                                    </span>
                                                </p>
                                                <p className="text-sm">
                                                    Subtotal:{" "}
                                                    <span className="font-bold text-yambo-black">
                                                        {(
                                                            product.price *
                                                            product.quantity
                                                        ).toFixed(
                                                            2,
                                                        )}{" "}
                                                        €
                                                    </span>
                                                </p>
                                                </div>
                                            </div>
                                        );
                                    },
                                )
                            ) : (
                                <p className="text-gray-400 italic text-center py-4">
                                    Sin productos
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-yambo-green-50/30 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                    <div className="text-lg font-bold text-yambo-black">
                        Total del pedido:
                        <span className="ml-2 text-2xl text-yambo-green-600 font-extrabold">
                            {order.products
                                ?.reduce(
                                    (total, p) =>
                                        total + p.price * p.quantity,
                                    0,
                                )
                                .toFixed(2)}{" "}
                            €
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isMerchAdmin && (
                            <ButtonComponent
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowHistory(true)}
                            >
                                <FontAwesomeIcon icon={faHistory} className="w-3.5 h-3.5 mr-1.5" />
                                Historial
                            </ButtonComponent>
                        )}
                        {canEdit && onEdit && order.status !== "CLOSED" && order.status !== "CANCELED" && (
                            <ButtonComponent
                                variant="secondary"
                                size="sm"
                                onClick={() => onEdit(order)}
                            >
                                <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5 mr-1.5" />
                                Editar
                            </ButtonComponent>
                        )}
                        {canDelete && onDelete && order.status !== "CLOSED" && (
                            <ButtonComponent
                                variant="danger-text"
                                size="sm"
                                onClick={() => onDelete(order)}
                            >
                                <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 mr-1.5" />
                                Eliminar
                            </ButtonComponent>
                        )}
                        {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                            <ButtonComponent
                                variant="danger-text"
                                size="sm"
                                onClick={() => onRequestCancel(order)}
                            >
                                Cancelar pedido
                            </ButtonComponent>
                        )}
                        <ButtonComponent
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cerrar
                        </ButtonComponent>
                    </div>
                </div>
            </div>

            <OrderHistoryModal
                orderId={order.id}
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </div>
    );
}
