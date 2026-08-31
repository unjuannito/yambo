import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Order, OrderProduct } from "~/services/orderService";
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
    readonly order?: Order;
    readonly receiptFileUrl?: string | null;
    readonly isMerchAdmin?: boolean;
    readonly products?: Product[];
    readonly drops?: FamilyProduct[];
    readonly selectedOrderIssues?: Issue[];
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

// Mocks de desarrollo para previsualizar el modal con grupos y configuraciones.
const mockDrops: FamilyProduct[] = [
    { id: "drop-barrio", name: "Sudaderas Barrio 2026", startTms: "2026-01-01T00:00:00.000Z", endTms: "2026-12-31T23:59:59.000Z", active: true },
    { id: "drop-jambo", name: "Sudaderas Jambo 2026", startTms: "2026-01-01T00:00:00.000Z", endTms: "2026-12-31T23:59:59.000Z", active: true },
    { id: "drop-clasica", name: "Sudaderas Clásicas 2025", startTms: "2025-09-01T00:00:00.000Z", endTms: "2025-12-31T23:59:59.000Z", active: true },
];

const mockProducts: Product[] = [
    { id: "prod-camiseta-barrio", name: "Camiseta Barrio", projectId: null, familyProductId: "drop-barrio", active: true, basePrice: 14.22, options: [] },
    { id: "prod-sudadera-jamboloco", name: "Sudadera Jamboloco", projectId: null, familyProductId: "drop-jambo", active: true, basePrice: 22.26, options: [] },
    { id: "prod-camiseta-jamboloco", name: "Camiseta Jamboloco", projectId: null, familyProductId: "drop-jambo", active: true, basePrice: 14.22, options: [] },
    { id: "prod-sudadera-clasica", name: "Sudadera Clásica", projectId: null, familyProductId: "drop-clasica", active: true, basePrice: 19.9, options: [] },
];

const mockOrder: Order = {
    id: "1knjpt1",
    user: { id: "user-julia", name: "Julia Gutiérrez", email: "julia.gutierrez@example.com" },
    status: "CONFIRMING_PAYMENT",
    createdAt: "2026-03-04T21:56:00.000Z",
    hasOpenIssues: true,
    products: [
        {
            id: "op-barrio-xs",
            productId: "prod-camiseta-barrio",
            productName: "Camiseta Barrio",
            quantity: 1,
            price: 14.22,
            configuration: JSON.stringify({ TALLA: "XS", NOMBRE: "JULIA", DESTINATARIO: "Julia Gutiérrez" }),
            status: "PENDING",
        },
        {
            id: "op-barrio-m",
            productId: "prod-camiseta-barrio",
            productName: "Camiseta Barrio",
            quantity: 2,
            price: 14.22,
            configuration: JSON.stringify({ TALLA: "M", NOMBRE: "MARIO", DESTINATARIO: "Mario López" }),
            status: "PENDING",
        },
        {
            id: "op-jambo-sudadera",
            productId: "prod-sudadera-jamboloco",
            productName: "Sudadera Jamboloco",
            quantity: 1,
            price: 22.26,
            configuration: JSON.stringify({ TALLA: "M", NOMBRE: "JULIA", DESTINATARIO: "Julia Gutiérrez", PARCHES: "Sí" }),
            status: "PENDING",
        },
        {
            id: "op-jambo-camiseta",
            productId: "prod-camiseta-jamboloco",
            productName: "Camiseta Jamboloco",
            quantity: 1,
            price: 14.22,
            configuration: JSON.stringify({ TALLA: "S", NOMBRE: "JULIA", DESTINATARIO: "Julia Gutiérrez" }),
            status: "PENDING",
        },
        {
            id: "op-jambo-sin-config",
            productId: "prod-camiseta-jamboloco",
            productName: "Camiseta Jamboloco",
            quantity: 1,
            price: 14.22,
            configuration: "{}",
            status: "PENDING",
        },
        {
            id: "op-clasica-m",
            productId: "prod-sudadera-clasica",
            productName: "Sudadera Clásica",
            quantity: 1,
            price: 19.9,
            configuration: JSON.stringify({ TALLA: "M", NOMBRE: "ANA" }),
            status: "PENDING",
        },
        {
            id: "op-clasica-l",
            productId: "prod-sudadera-clasica",
            productName: "Sudadera Clásica",
            quantity: 1,
            price: 19.9,
            configuration: JSON.stringify({ TALLA: "L", NOMBRE: "LUIS", COLOR: "Verde" }),
            status: "PENDING",
        },
    ],
};

export function OrderDetailsModal({
    order = mockOrder,
    receiptFileUrl = null,
    isMerchAdmin = true,
    products = mockProducts,
    drops = mockDrops,
    selectedOrderIssues = [],
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
    const { t } = useTranslation();
    const [showHistory, setShowHistory] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [expandedIssuesProductId, setExpandedIssuesProductId] = useState<string | null>(null);

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

    const groupedProducts = useMemo(() => {

        if (!order.products || order.products.length === 0) return [];
        const groups = new Map<string, { drop: FamilyProduct | null; items: OrderProduct[] }>();
        for (const product of order.products) {
            const productData = products.find((p) => p.id === product.productId);
            const productDrop = productData?.familyProductId
                ? (drops.find((drop) => drop.id === productData.familyProductId) ?? null)
                : null;
            const key = productDrop?.id ?? "__ungrouped__";
            const group = groups.get(key);
            if (group) {
                group.items.push(product);
            } else {
                groups.set(key, { drop: productDrop, items: [product] });
            }
        }
        return Array.from(groups.entries()).map(([key, group]) => ({ key, ...group }));
    }, [order.products, products, drops]);

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
                                {t("orders.details.title")}
                            </h2>
                            <span className="mt-1.5 inline-flex items-center font-mono text-xs text-yambo-green-700 bg-white/70 border border-yambo-green-100 px-2.5 py-0.5 rounded-full">
                                {t("orders.details.id", { id: order.id })}
                            </span>
                        </div>
                        <button type="button"
                            onClick={onClose}
                            aria-label={t("common.close")}
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
                                            {t("orders.details.viewHistory")}
                                        </button>
                                    )}
                                    {canDeleteOrder && (
                                        <button type="button"
                                            onClick={() => { setShowActionsMenu(false); onDelete?.(order); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 text-left transition-colors border-t border-gray-100"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                            {t("orders.details.deleteOrder")}
                                        </button>
                                    )}
                                    {canCancelOrder && (
                                        <button type="button"
                                            onClick={() => { setShowActionsMenu(false); onRequestCancel(order); }}
                                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                                        >
                                            {t("orders.details.cancelOrder")}
                                        </button>
                                    )}
                                    <button type="button"
                                        onClick={() => { setShowActionsMenu(false); onClose(); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="w-4 h-4 text-gray-400" />
                                        {t("common.close")}
                                    </button>
                                </div>
                            )}
                            <div className="flex items-baseline justify-between mb-2.5">
                                <span className="text-sm font-bold text-gray-500">{t("orders.details.total")}</span>
                                <span className="text-2xl font-extrabold text-yambo-green-600">{orderTotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {canEditOrder ? (
                                    <button type="button"
                                        onClick={() => onEdit?.(order)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-yambo-green-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-yambo-green-700 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faPencil} className="w-4 h-4" />
                                        {t("orders.details.editOrder")}
                                    </button>
                                ) : (
                                    <button type="button"
                                        onClick={onClose}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors"
                                    >
                                        {t("common.close")}
                                    </button>
                                )}
                                <button type="button"
                                    onClick={() => setShowActionsMenu(v => !v)}
                                    aria-label={t("orders.details.moreOptions")}
                                    className="h-11 w-11 shrink-0 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faEllipsisVertical} className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer (escritorio) */}
                        <div className="hidden sm:flex bg-yambo-green-50/30 px-6 py-4 border-t border-gray-100 justify-between items-center">
                            <div className="text-lg font-bold text-yambo-black">
                                {t("orders.details.total")}:
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
                                        {t("orders.details.history")}
                                    </ButtonComponent>
                                )}
                                {canEditOrder && (
                                    <ButtonComponent
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => onEdit?.(order)}
                                    >
                                        <FontAwesomeIcon icon={faPencil} className="w-3.5 h-3.5 mr-1.5" />
                                        {t("common.edit")}
                                    </ButtonComponent>
                                )}
                                {canDeleteOrder && (
                                    <ButtonComponent
                                        variant="danger-text"
                                        size="sm"
                                        onClick={() => onDelete?.(order)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 mr-1.5" />
                                        {t("common.delete")}
                                    </ButtonComponent>
                                )}
                                {canCancelOrder && (
                                    <ButtonComponent
                                        variant="danger-text"
                                        size="sm"
                                        onClick={() => onRequestCancel(order)}
                                    >
                                        {t("orders.details.cancelOrder")}
                                    </ButtonComponent>
                                )}
                                <ButtonComponent
                                    variant="secondary"
                                    onClick={onClose}
                                >
                                    {t("common.close")}
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
                                {t("orders.details.customer")}
                            </p>
                            <p className="text-sm font-medium text-yambo-black">
                                {order.user?.name || t("common.notAvailable")}
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
                                {t("orders.details.status")}
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
                                        {t("orders.details.pendingIssues")}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">
                                {t("orders.details.createdAt")}
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
                            <p className="text-sm text-gray-400 mb-2">{t("orders.details.receipt")}</p>
                            <div className="flex items-center gap-3">
                                {order.receiptFileId && receiptFileUrl && (
                                    <a
                                        href={receiptFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-yambo-green-50 text-yambo-green-700 rounded-xl hover:bg-yambo-green-100 transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faFileArrowDown} className="w-4 h-4" />
                                        {t("orders.details.viewReceipt")}
                                    </a>
                                )}
                                {canEdit && (
                                    <button type="button"
                                        onClick={() => onUploadReceipt(order)}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-yambo-green-50 text-yambo-green-700 rounded-xl hover:bg-yambo-green-100 transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                                        {order.receiptFileId ? t("orders.details.replaceReceipt") : t("orders.details.uploadReceipt")}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="text-lg font-bold font-display text-yambo-black">
                                {t("orders.details.products")}
                            </h3>
                            {isMerchAdmin && (
                                <button type="button"
                                    onClick={() => onOpenIssueWindow(order)}
                                    className="w-full sm:w-auto text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors text-left"
                                >
                                    {t("orders.details.newIssue")}
                                </button>
                            )}
                        </div>
                        {groupedProducts.length > 0 ? (
                            <div className="space-y-2">
                                {groupedProducts.map((group) => {
                                    return (
                                        <fieldset key={group.key} className="border border-yambo-green-500 rounded-xl p-0 w-full min-w-0">
                                            {group.drop && (
                                                <legend className="ml-4 px-2 bg-white text-sm font-semibold text-yambo-green-700">
                                                    {group.drop.name}
                                                </legend>
                                            )}
                                            <div className="overflow-hidden rounded-xl pt-3">
                                                <div className="divide-y divide-gray-100">
                                                    {group.items.map((product) => {
                                                        const configEntries = parseConfig(product.configuration ?? "");
                                                        const productIssues = selectedOrderIssues.filter(
                                                            issue => getIssueOrderedProductIds(issue).includes(product.id)
                                                        );
                                                        const productKey = product.id || product.productId;
                                                        const isExpanded = expandedIssuesProductId === productKey;
                                                        return (
                                                            <div key={productKey}>
                                                                <div className="px-4 py-3 flex justify-between">
                                                                    <div className="flex items-center justify-end gap-3 mt-2">
                                                                        <span className="font-semibold text-yambo-black whitespace-nowrap align-middle row-span-2">
                                                                            {product.productName || product.productId}
                                                                        </span>
                                                                        {productIssues.length > 0 && (
                                                                            <button type="button"
                                                                                onClick={() => setExpandedIssuesProductId(isExpanded ? null : productKey)}
                                                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap"
                                                                            >
                                                                                {t("orders.details.issueCount", { count: productIssues.length })}
                                                                            </button>
                                                                        )}
                                                                        <div
                                                                            className="grid items-start gap-x-6 gap-y-1 "
                                                                            style={{ gridTemplateColumns: `max-content repeat(${configEntries.length}, max-content)` }}
                                                                        >
                                                                            {configEntries.map(([label]) => (
                                                                                <span key={`${label}-head`} className="text-xs font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                                                                                    {label}
                                                                                </span>
                                                                            ))}
                                                                            {configEntries.length > 0 && <span />}
                                                                            {configEntries.map(([label, value]) => (
                                                                                <span key={label} className="text-gray-700 whitespace-nowrap">
                                                                                    {value}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-3 mt-2">
                                                                        <span className="text-gray-500 whitespace-nowrap">{t("orders.details.quantityShort", { count: product.quantity })}</span>
                                                                        {product.quantity > 1 && (
                                                                            <span className="text-gray-400 text-xs whitespace-nowrap">
                                                                                {t("orders.details.unitPriceHint", { price: product.price.toFixed(2) })}
                                                                            </span>
                                                                        )}
                                                                        <span className="font-bold text-yambo-black whitespace-nowrap"> {product.quantity > 1 ? t("orders.details.subtotal") : t("orders.details.price")}: {(product.price * product.quantity).toFixed(2)} €</span>
                                                                    </div>
                                                                </div>
                                                                {isExpanded && productIssues.length > 0 && (
                                                                    <div className="px-4 pb-3">
                                                                        <ul className="space-y-1.5">
                                                                            {productIssues.map(issue => (
                                                                                <li key={issue.id} className="flex items-center gap-2">
                                                                                    <IssueStatusBadge status={issue.status} />
                                                                                    <span className="text-sm text-gray-700 flex-1 truncate">{issue.title}</span>
                                                                                    <button type="button"
                                                                                        onClick={() => onViewIssue(issue.id)}
                                                                                        className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium transition-colors shrink-0"
                                                                                    >
                                                                                        {t("common.view")}
                                                                                    </button>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </fieldset>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic text-center py-4">
                                {t("orders.details.noProducts")}
                            </p>
                        )}
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
