import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/orders";
import type { Order } from "~/services/orderService";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type {
    FilterableColumn,
    FetchDataParams,
} from "~/components/common/FilterableTable";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import { orderService } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { issueService } from "~/services/issueService";
import { fileService } from "~/services/fileService";
import type { Issue } from "~/types/issueType";
import { getIssueOrderedProductIds } from "~/utils/issueUtils";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { StatusWorkflow } from "~/components/common/StatusWorkflow";
import { exportOrdersToExcel } from "~/utils/exportOrdersToExcel";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { IssueStatusBadge } from "~/components/issues";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faXmark, faFileArrowDown } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Pedidos" },
        { name: "Yambo - Pedidos", content: "Yambo - Pedidos" },
    ];
}

export default function Orders() {
    const navigate = useNavigate();
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [refreshKey, setRefreshKey] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedOrderIssues, setSelectedOrderIssues] = useState<Issue[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [allOrdersOnPage, setAllOrdersOnPage] = useState<Order[]>([]);
    const [bulkStatus, setBulkStatus] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [drops, setDrops] = useState<FamilyProduct[]>([]);
    const [selectedDropIds, setSelectedDropIds] = useState<string[]>([]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null);

    const [statusOptions] = useState(
        Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => ({
            value: key,
            label: config.label,
        })),
    );

    useEffect(() => {
        const loadData = async () => {
            try {
                const [productsResponse, dropsResponse] = await Promise.all([
                    productService.getAllProducts(0, 500),
                    familyProductService.listFamilyProducts(0, 200),
                ]);
                setProducts(productsResponse.content);
                setDrops(dropsResponse.content);
            } catch (err) {
                toast.error(getErrorMessage(err, "Error al cargar productos y drops"));
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        const loadOrderIssues = async () => {
            if (selectedOrder) {
                try {
                    const issues = await issueService.getIssuesByOrder(selectedOrder.id);
                    setSelectedOrderIssues(issues);
                } catch (err) {
                    toast.error(getErrorMessage(err, "Error al cargar las incidencias"));
                    setSelectedOrderIssues([]);
                }

                // Load receipt file URL if available
                if (selectedOrder.receiptFileId) {
                    try {
                        const file = await fileService.getById(selectedOrder.receiptFileId);
                        setReceiptFileUrl(file.url);
                    } catch {
                        setReceiptFileUrl(null);
                    }
                } else {
                    setReceiptFileUrl(null);
                }
            } else {
                setSelectedOrderIssues([]);
                setReceiptFileUrl(null);
            }
        };

        loadOrderIssues();
    }, [selectedOrder]);
    const fetchOrdersData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const statusFilter = Array.isArray(filters.status) && filters.status.length > 0
                ? filters.status as string[]
                : undefined;
            const result = await orderService.getAllOrders(
                page,
                size,
                filters.customerId,
                statusFilter,
                startDate,
            );
            setAllOrdersOnPage(result.content);
            setSelectedOrders([]); // Clear selections when data changes
            return result;
        },
        [refreshKey, activeTab],
    );

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await orderService.updateOrderStatus(orderId, newStatus);
            toast.success("Estado del pedido actualizado");
            setRefreshKey((prev) => prev + 1); // Refresh table
        } catch (err) {
            toast.error(
                getErrorMessage(err, "Error al actualizar el estado"),
            );
        }
    };

    const handleCancelOrder = async () => {
        if (!orderToCancel) return;
        setIsCanceling(true);
        try {
            await orderService.updateOrderStatus(orderToCancel.id, "CANCELED");
            toast.success(`Pedido #${orderToCancel.id} cancelado`);
            setRefreshKey((prev) => prev + 1);
            if (selectedOrder?.id === orderToCancel.id) {
                setSelectedOrder(null);
            }
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al cancelar el pedido"));
        } finally {
            setIsCanceling(false);
            setOrderToCancel(null);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedOrders.length === 0) {
            toast.error("Selecciona al menos un pedido");
            return;
        }
        if (!bulkStatus) {
            toast.error("Selecciona un estado");
            return;
        }

        try {
            await Promise.all(
                selectedOrders.map((orderId) =>
                    orderService.updateOrderStatus(orderId, bulkStatus),
                ),
            );
            toast.success(`${selectedOrders.length} pedidos actualizados`);
            setSelectedOrders([]);
            setBulkStatus("");
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar los pedidos"));
        }
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrders((prev) =>
            prev.includes(orderId)
                ? prev.filter((id) => id !== orderId)
                : [...prev, orderId],
        );
    };

    const toggleSelectAll = () => {
        if (selectedOrders.length === allOrdersOnPage.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(allOrdersOnPage.map((order) => order.id));
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const allOrders = await orderService.getAllOrders(0, 10000);

            await exportOrdersToExcel({
                orders: allOrders.content,
                products,
                drops,
                selectedDropIds
            });

            const dropsLabel = selectedDropIds.length > 0 ? `${selectedDropIds.length} drops seleccionados` : 'todos los drops';
            toast.success(
                `Exportados ${allOrders.content.length} pedidos (${dropsLabel}) a Excel con múltiples hojas`,
            );
            setIsExportModalOpen(false);
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al exportar a Excel"));
        } finally {
            setIsExporting(false);
        }
    };

    const orderTableColumns: FilterableColumn<Order>[] = [
        {
            key: "checkbox",
            header: (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={
                            selectedOrders.length > 0 &&
                            selectedOrders.length === allOrdersOnPage.length
                        }
                        ref={(el) => {
                            if (el) {
                                el.indeterminate =
                                    selectedOrders.length > 0 &&
                                    selectedOrders.length <
                                        allOrdersOnPage.length;
                            }
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        title={
                            selectedOrders.length > 0 &&
                            selectedOrders.length === allOrdersOnPage.length
                                ? "Deseleccionar todos"
                                : "Seleccionar todos los visibles"
                        }
                    />
                </div>
            ),
            render: (order: Order) => (
                <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => toggleOrderSelection(order.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
            ),
        },
        {
            key: "id",
            header: "ID",
            render: (order: Order) => (
                <span className="font-mono text-xs">{order.id}</span>
            ),
        },
        {
            key: "customerId",
            header: "Cliente",
            filter: {
                enabled: true,
                type: "text",
                placeholder: "Buscar por cliente...",
            },
            render: (order: Order) => (
                <div className="text-xs">
                    <p className="font-medium">{order.user?.name || "N/A"}</p>
                    <p className="text-gray-500 text-xs">
                        {order.user?.email || ""}
                    </p>
                </div>
            ),
        },
        {
            key: "status",
            header: "Estado",
            filter: {
                enabled: true,
                type: "multi-select",
                placeholder: "Filtrar estados...",
                options: statusOptions,
            },
            render: (order: Order) => {
                const config =
                    ORDER_STATUS_CONFIG[
                        order.status as keyof typeof ORDER_STATUS_CONFIG
                    ];
                return (
                    <div className="flex flex-col gap-1">
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                                config?.className || "bg-gray-100 text-gray-800"
                            }`}
                        >
                            {config?.shortLabel || order.status}
                        </span>
                        {order.hasOpenIssues && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Inc. Pendientes
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "createdAt",
            header: "Fecha",
            render: (order: Order) => (
                <span className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "products",
            header: "Productos",
            render: (order: Order) => (
                <span className="text-sm text-gray-600">
                    {order.products.reduce((sum, p) => sum + p.quantity, 0) ||
                        0}{" "}
                    productos
                </span>
            ),
        },
        {
            key: "total",
            header: "Total",
            render: (order: Order) => {
                const total =
                    order.products?.reduce(
                        (sum, p) => sum + p.price * p.quantity,
                        0,
                    ) || 0;
                return (
                    <span className="text-sm font-bold text-gray-900">
                        {total.toFixed(2)} €
                    </span>
                );
            },
        },
        {
            key: "actions",
            header: "Acciones",
            render: (order: Order) => (
                <div className="flex items-center gap-2">
                    <select
                        value={order.status}
                        onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={
                            order.status === "CLOSED" ||
                            order.status === "CANCELED"
                        }
                    >
                        {Object.entries(ORDER_STATUS_CONFIG).map(
                            ([key, config]) => (
                                <option key={key} value={key}>
                                    {config.shortLabel}
                                </option>
                            ),
                        )}
                    </select>
                    <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        title="Ver detalles"
                    >
                        Ver
                    </button>
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <button
                            onClick={() => setOrderToCancel(order)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                            title="Cancelar pedido"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            ),
        },
    ];

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
        <RequirePermission
            permission={{ obj: "order", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">Pedidos</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsExportModalOpen(true)}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <FontAwesomeIcon icon={faFileExport} className="w-5 h-5" />
                            Exportar a Excel
                        </button>
                    </div>
                </div>

                <StatusWorkflow
                    title="Flujo de estados del pedido"
                    config={ORDER_STATUS_CONFIG}
                    transitions={ORDER_WORKFLOW_TRANSITIONS}
                />

                <ViewTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); }} />

                {/* Bulk Actions Toolbar */}
                {selectedOrders.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedOrders.length} pedido
                                {selectedOrders.length !== 1 ? "s" : ""}{" "}
                                seleccionado
                                {selectedOrders.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                            <select
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Cambiar estado a...</option>
                                {Object.entries(ORDER_STATUS_CONFIG).map(
                                    ([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ),
                                )}
                            </select>
                            <button
                                onClick={handleBulkStatusUpdate}
                                disabled={!bulkStatus}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Actualizar
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedOrders([])}
                            className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                <FilterableTable
                    columns={orderTableColumns}
                    keyField="id"
                    display={{
                        emptyMessage: "No se encontraron pedidos",
                        loadingMessage: "Cargando pedidos...",
                    }}
                    features={{ enableLoadMore: true }}
                    serverSide={{ fetchData: fetchOrdersData }}
                />
            </main>

            <Modal
                isOpen={isExportModalOpen}
                onClose={() => {
                    if (!isExporting) setIsExportModalOpen(false);
                }}
                title="Exportar pedidos"
                size="md"
                footer={
                    <>
                        <button
                            onClick={() => setIsExportModalOpen(false)}
                            disabled={isExporting}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={exportToExcel}
                            disabled={isExporting}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isExporting ? "Exportando..." : "Exportar"}
                        </button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600">
                        Selecciona los drops a incluir. Si no eliges ninguno, se exportan todos.
                    </p>
                    <MultiSelectComponent
                        label="Filtrar por Drops"
                        value={selectedDropIds}
                        options={drops.map((drop) => ({
                            value: drop.id,
                            label: drop.name,
                        }))}
                        placeholder="Todos los drops"
                        name="selectedDrops"
                        onChange={(e) => {
                            const select = e.target as HTMLSelectElement;
                            const values = Array.from(select.selectedOptions).map(
                                (opt) => opt.value,
                            );
                            setSelectedDropIds(values);
                        }}
                    />
                    <div className="text-xs text-gray-500">
                        Se exportan todos los pedidos con sus hojas de resumen y detalle.
                    </div>
                </div>
            </Modal>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Detalles del Pedido
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    ID:{" "}
                                    <span className="font-mono">
                                        {selectedOrder.id}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Cliente
                                    </p>
                                    <p className="text-sm font-medium">
                                        {selectedOrder.user?.name || "N/A"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        <a
                                            href={`mailto:${selectedOrder.user?.email || ""}`}
                                        >
                                            {selectedOrder.user?.email || ""}
                                        </a>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Estado
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                                ORDER_STATUS_CONFIG[
                                                    selectedOrder.status as keyof typeof ORDER_STATUS_CONFIG
                                                ]?.className ||
                                                "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {ORDER_STATUS_CONFIG[
                                                selectedOrder.status as keyof typeof ORDER_STATUS_CONFIG
                                            ]?.shortLabel || selectedOrder.status}
                                        </span>
                                        {selectedOrder.hasOpenIssues && (
                                            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                                                Incidencias Pendientes
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Fecha de creación
                                    </p>
                                    <p className="text-sm font-medium">
                                        {new Date(
                                            selectedOrder.createdAt,
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
                            {selectedOrder.receiptFileId && receiptFileUrl && (
                                <div className="mb-6 pb-6 border-b border-gray-200">
                                    <p className="text-sm text-gray-600 mb-2">Justificante de pago</p>
                                    <a
                                        href={receiptFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faFileArrowDown} className="w-4 h-4" />
                                        Ver justificante
                                    </a>
                                </div>
                            )}

                            {/* Products */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">
                                    Productos
                                </h3>
                                <div className="space-y-4">
                                    {selectedOrder.products &&
                                    selectedOrder.products.length > 0 ? (
                                        selectedOrder.products.map(
                                            (product, idx) => {
                                                const productData = products.find(p => p.id === product.productId);
                                                const productDrop = productData?.familyProductId
                                                    ? drops.find(drop => drop.id === productData.familyProductId)
                                                    : null;

                                                const productIssue = selectedOrderIssues.find(
                                                    issue => getIssueOrderedProductIds(issue).includes(product.id)
                                                );

                                                return (
                                                    <div
                                                        key={`${selectedOrder.id}-${product.productId}-${idx}`}
                                                        className="bg-gray-50 rounded-lg p-4"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">
                                                                    {product.productName ||
                                                                        product.productId}
                                                                </p>
                                                                {productDrop && (
                                                                    <div className="mt-1 mb-2">
                                                                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium text-xs">
                                                                            {productDrop.name}
                                                                        </span>
                                                                        {productDrop.endTms && (
                                                                            <span className="text-xs text-gray-600 ml-2">
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
                                                                        <p className="text-sm text-gray-600 mt-1">
                                                                            <span className="font-medium">
                                                                                Configuración:
                                                                            </span>{" "}
                                                                            {formatConfiguration(
                                                                                product.configuration,
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                {productIssue && (
                                                                    <div className="mt-2 flex items-center gap-2">
                                                                        <IssueStatusBadge status={productIssue.status} />
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedOrder(null);
                                                                                navigate(`/mi-espacio/incidencias/${productIssue.id}`);
                                                                            }}
                                                                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                                                                        >
                                                                            Ver incidencia
                                                                        </button>
                                                                    </div>
                                                                )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-sm text-gray-600">
                                                                Precio unitario
                                                            </p>
                                                            <p className="font-bold text-blue-600">
                                                                {product.price.toFixed(
                                                                    2,
                                                                )}{" "}
                                                                €
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                        <p className="text-sm text-gray-600">
                                                            Cantidad:{" "}
                                                            <span className="font-medium text-gray-900">
                                                                {
                                                                    product.quantity
                                                                }
                                                            </span>
                                                        </p>
                                                        <p className="text-sm">
                                                            Subtotal:{" "}
                                                            <span className="font-bold text-gray-900">
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
                                        <p className="text-gray-500 italic text-center py-4">
                                            Sin productos
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                            <div className="text-lg font-bold text-gray-900">
                                Total del pedido:
                                <span className="ml-2 text-2xl text-blue-600">
                                    {selectedOrder.products
                                        ?.reduce(
                                            (total, p) =>
                                                total + p.price * p.quantity,
                                            0,
                                        )
                                        .toFixed(2)}{" "}
                                    €
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {(selectedOrder.status === "PENDING_PAYMENT" || selectedOrder.status === "CONFIRMING_PAYMENT") && (
                                    <button
                                        onClick={() => setOrderToCancel(selectedOrder)}
                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                    >
                                        Cancelar pedido
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Cancel Order Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!orderToCancel}
                onClose={() => setOrderToCancel(null)}
                onConfirm={handleCancelOrder}
                title="¿Cancelar pedido?"
                message={`¿Estás seguro de que quieres cancelar el pedido #${orderToCancel?.id ?? ""}? Esta acción no se puede deshacer.`}
                confirmLabel="Sí, cancelar pedido"
                cancelLabel="Volver"
                variant="danger"
                isLoading={isCanceling}
            />
        </RequirePermission>

    );
}


