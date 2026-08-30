import { useState } from "react";
import type { Order } from "~/services/orderService";
import type { Product } from "~/services/productService";
import type { FamilyProduct } from "~/services/familyProductService";
import type { Issue } from "~/types/issueType";
import { getIssueOrderedProductIds } from "~/utils/issueUtils";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { IssueStatusBadge } from "~/components/issues/IssueStatusBadge";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { Modal } from "~/components/common/Modal";
import { OrderHistoryModal } from "./OrderHistoryModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faFileArrowDown, faUpload, faPencil, faTrash, faHistory, faEllipsisVertical, faClock } from "@fortawesome/free-solid-svg-icons";

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
    const [showActionsMenu, setShowActionsMenu] = useState(false);

    /** Convierte la configuración JSON del producto en pares [etiqueta, valor]. */
    const parseConfig = (configStr: string): [string, string][] => {
        try {
            const config = JSON.parse(configStr);
            return Object.entries(config)
                .map(([key, value]) => {
                    if (value == null || (typeof value === "string" && value.trim() === "")) return null;
                    if (typeof value === "boolean") return value ? ([key, "Sí"] as [string, string]) : null;
                    return [key, String(value)] as [string, string];
                })
                .filter((entry): entry is [string, string] => entry !== null);
        } catch {
            return [];
        }
    };

    const canEditOrder = !!canEdit && !!onEdit && order.status !== "CLOSED" && order.status !== "CANCELED";
    const canDeleteOrder = !!canDelete && !!onDelete && order.status !== "CLOSED";
    const canCancelOrder = order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT";
    const orderTotal = order.products?.reduce((total, p) => total + p.price * p.quantity, 0) ?? 0;

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                variant="bottom-sheet"
                size="lg"
                bodyClassName="p-4 sm:p-6"
                footerClassName="p-0 border-t-0 shrink-0"
                header={
                    <div className="bg-yambo-green-50/50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                            <h2 className="text-xl font-extrabold font-display text-yambo-black">
                                Detalles del Pedido
                            </h2>
                            <span className="mt-1.5 inline-flex items-center font-mono text-xs text-yambo-green-700 bg-white/70 border border-yambo-green-100 px-2.5 py-0.5 rounded-full">
                                ID: {order.id}
                            </span>
                        </div>
                        <button type="button"
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="h-9 w-9 shrink-0 rounded-full bg-white/70 text-gray-500 hover:text-yambo-coral flex items-center justify-center transition-colors"
                        >
                            <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
                        </button>
                    </div>
                }
                footer={
                    <>
                        {/* Modal Footer (móvil) */}
                        <div className="sm:hidden relative bg-white px-4 py-3 border-t border-gray-100">
                            {showActionsMenu && (
                                <div className="absolute bottom-[calc(100%+8px)] right-4 z-20 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                    {isMerchAdmin && (
                                        <button type="button"
                                            onClick={() => { setShowActionsMenu(false); setShowHistory(true); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faHistory} className="w-4 h-4 text-gray-400" />
                                            Ver historial
                                        </button>
                                    )}
                                    {canDeleteOrder && (
                                        <button type="button"
                                            onClick={() => { setShowActionsMenu(false); onDelete?.(order); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 text-left transition-colors border-t border-gray-100"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                            Eliminar pedido
                                        </button>
                                    )}
                                    {canCancelOrder && (
                                        <button type="button"
                                            onClick={() => { setShowActionsMenu(false); onRequestCancel(order); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                                        >
                                            Cancelar pedido
                                        </button>
                                    )}
                                    <button type="button"
                                        onClick={() => { setShowActionsMenu(false); onClose(); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-gray-400" />
                                        Cerrar
                                    </button>
                                </div>
                            )}
                            <div className="flex items-baseline justify-between mb-2.5">
                                <span className="text-sm font-bold text-gray-500">Total del pedido</span>
                                <span className="text-2xl font-extrabold text-yambo-green-600">{orderTotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {canEditOrder ? (
                                    <button type="button"
                                        onClick={() => onEdit?.(order)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-yambo-green-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-yambo-green-700 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faPencil} className="w-4 h-4" />
                                        Editar pedido
                                    </button>
                                ) : (
                                    <button type="button"
                                        onClick={onClose}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                )}
                                <button type="button"
                                    onClick={() => setShowActionsMenu(v => !v)}
                                    aria-label="Más opciones"
                                    className="h-11 w-11 shrink-0 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faEllipsisVertical} className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer (escritorio) */}
                        <div className="hidden sm:flex bg-yambo-green-50/30 px-6 py-4 border-t border-gray-100 justify-between items-center">
                            <div className="text-lg font-bold text-yambo-black">
                                Total del pedido:
                                <span className="ml-2 text-2xl text-yambo-green-600 font-extrabold">
                                    {orderTotal.toFixed(2)} €
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
                                {canEditOrder && (
                                    <ButtonComponent
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEdit?.(order)}
                                    >
                                        <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </ButtonComponent>
                                )}
                                {canDeleteOrder && (
                                    <ButtonComponent
                                        variant="danger-text"
                                        size="sm"
                                        onClick={() => onDelete?.(order)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 mr-1.5" />
                                        Eliminar
                                    </ButtonComponent>
                                )}
                                {canCancelOrder && (
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
                    </>
                }
            >
                {/* Order Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
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
                                    className="break-all"
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
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="text-lg font-bold font-display text-yambo-black">
                                Productos
                            </h3>
                            {isMerchAdmin && (
                                <button type="button"
                                    onClick={() => onOpenIssueWindow(order)}
                                    className="w-full sm:w-auto text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors text-left"
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
                                        const configEntries = parseConfig(product.configuration ?? "");

                                        return (
                                            <div
                                                key={`${order.id}-${product.productId}-${idx}`}
                                                className="bg-gray-50/50 rounded-2xl p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-yambo-black">
                                                            {product.productName || product.productId}
                                                        </p>
                                                        {productDrop && (
                                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                                <span className="inline-flex items-center bg-yambo-green-50 text-yambo-green-700 px-2.5 py-1 rounded-full font-medium text-xs">
                                                                    {productDrop.name}
                                                                </span>
                                                                {productDrop.endTms && (
                                                                    <span className="inline-flex items-center gap-1 bg-white text-gray-500 px-2.5 py-1 rounded-full font-medium text-xs border border-gray-100">
                                                                        <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                                                                        Hasta {new Date(productDrop.endTms).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-xs text-gray-400">Precio</p>
                                                        <p className="font-bold text-yambo-green-600">{product.price.toFixed(2)} €</p>
                                                    </div>
                                                </div>

                                                {configEntries.length > 0 ? (
                                                    <div className="mt-3 pt-3 border-t border-gray-200/70 grid grid-cols-2 gap-x-3 gap-y-2">
                                                        {configEntries.map(([label, value]) => (
                                                            <div key={label} className="min-w-0">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                                                                <p className="text-sm font-medium text-yambo-black break-words">{value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : product.configuration && product.configuration !== "{}" ? (
                                                    <p className="mt-3 pt-3 border-t border-gray-200/70 text-sm text-gray-500 break-words">{product.configuration}</p>
                                                ) : null}

                                                {productIssues.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200/70">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Incidencias vinculadas</p>
                                                        <ul className="space-y-2">
                                                            {productIssues.map(issue => (
                                                                <li key={issue.id} className="flex items-center gap-2">
                                                                    <IssueStatusBadge status={issue.status} />
                                                                    <span className="text-sm text-gray-700 flex-1 truncate">{issue.title}</span>
                                                                    <button type="button"
                                                                        onClick={() => onViewIssue(issue.id)}
                                                                        className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium transition-colors shrink-0"
                                                                    >
                                                                        Ver
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {isMerchAdmin && (
                                                    <button type="button"
                                                        onClick={() => onOpenIssueWindow(order, product.id)}
                                                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-yambo-green-500 text-yambo-green-700 text-sm font-semibold hover:bg-yambo-green-50 transition-colors"
                                                    >
                                                        + Crear incidencia
                                                    </button>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-gray-200/70 flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">
                                                        Cantidad: <span className="font-semibold text-yambo-black">{product.quantity}</span>
                                                    </span>
                                                    <span className="font-bold text-yambo-black">
                                                        Subtotal: {(product.price * product.quantity).toFixed(2)} €
                                                    </span>
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
            </Modal>

            <OrderHistoryModal
                orderId={order.id}
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </>
    );
}
