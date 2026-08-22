import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Route } from "./+types/index";
import type { Order } from "~/services/orderService";
import { RequirePermission } from "~/components/common/RequirePermission";
import { PageHeader } from "~/components/common/PageHeader";
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
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { exportService, type ExportReportType } from "~/services/exportService";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import type { IssueReportWindowModel } from "~/types/issueType";
import { CreateIssueModal } from "~/components/issues/CreateIssueModal";
import { OrderEditorModal } from "~/components/orders/OrderEditorModal";
import { useAuth } from "~/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFileExport, faXmark, faUpload, faUser } from "@fortawesome/free-solid-svg-icons";
import type { FileRecord } from "~/types/fileType";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { PageContainer } from "~/components/common/PageContainer";
import { BulkActionsToolbar } from "~/components/orders/BulkActionsToolbar";
import { ExportOrdersModal } from "~/components/orders/ExportOrdersModal";
import { OrderDetailsModal } from "~/components/orders/OrderDetailsModal";
import { UploadReceiptModal } from "~/components/orders/UploadReceiptModal";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Pedidos" },
        { name: "Yambo - Pedidos", content: "Yambo - Pedidos" },
    ];
}

export default function Orders() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [reportType, setReportType] = useState<ExportReportType>('FULL');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [editorOrder, setEditorOrder] = useState<Order | null | undefined>(undefined);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null);
    const [uploadReceiptOrder, setUploadReceiptOrder] = useState<Order | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const deepLinkLookupRef = useRef<string | null>(null);
    const suppressAutoOpenRef = useRef(false);
    const { hasPermission } = useAuth();
    const isMerchAdmin = hasPermission({ obj: "issue", action: "update" });
    const [issueWindow, setIssueWindow] = useState<IssueReportWindowModel | null>(null);

    const openIssueWindow = (order: Order, preselectedProductId?: string) => {
        const orderedProducts = order.products.map((p) => ({
            id: p.id,
            name: p.productName || p.productId,
            configuration: p.configuration ?? undefined,
            quantity: p.quantity,
            unitPrice: p.price,
        }));
        setIssueWindow({
            orderId: order.id,
            orderedProducts,
            initialSelectedOrderedProductIds: preselectedProductId ? [preselectedProductId] : undefined,
        });
    };

    const statusOptions = useMemo(
        () =>
            Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => ({
                value: key,
                label: config.label,
            })),
        [],
    );

    const closeOrderDetail = useCallback(() => {
        suppressAutoOpenRef.current = true;
        if (searchParams.get("orderId")) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("orderId");
            setSearchParams(nextParams, { replace: true });
        }
        setSelectedOrder(null);
    }, [searchParams, setSearchParams]);

    const openOrderDetail = useCallback((order: Order) => {
        if (searchParams.get("orderId") !== order.id) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("orderId", order.id);
            setSearchParams(nextParams, { replace: true });
        }
        setSelectedOrder(order);
    }, [searchParams, setSearchParams]);

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
                toast.error(getErrorMessage(err, "Los productos y colecciones no quieren salir"));
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
                    toast.error(getErrorMessage(err, "Las incidencias se nos esconden"));
                    setSelectedOrderIssues([]);
                }

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

    useEffect(() => {
        const orderId = searchParams.get("orderId");
        if (!orderId || selectedOrder || suppressAutoOpenRef.current) {
            return;
        }

        const order = allOrdersOnPage.find((item) => item.id === orderId);
        if (order) {
            setSelectedOrder(order);
            return;
        }

        if (deepLinkLookupRef.current === orderId) {
            return;
        }

        deepLinkLookupRef.current = orderId;

        void orderService.getOrder(orderId)
            .then((deepLinkedOrder) => {
                if (deepLinkLookupRef.current !== orderId) {
                    return;
                }

                setSelectedOrder(deepLinkedOrder);
            })
            .catch(() => {
                // Keep the list usable even if deep-link lookup fails.
            });
    }, [allOrdersOnPage, searchParams, selectedOrder, setSearchParams]);

    useEffect(() => {
        if (!searchParams.get("orderId")) {
            deepLinkLookupRef.current = null;
            suppressAutoOpenRef.current = false;
        }
    }, [searchParams]);

    const fetchOrdersData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const statusFilter = Array.isArray(filters.status) && filters.status.length > 0
                ? filters.status as string[]
                : undefined;
            const dateRange = filters.dateRange as { startDate?: string; endDate?: string } | undefined;
            const effectiveStartDate = dateRange?.startDate
                ? new Date(dateRange.startDate).toISOString()
                : startDate;
            const effectiveEndDate = dateRange?.endDate
                ? new Date(dateRange.endDate + "T23:59:59").toISOString()
                : undefined;
            const customerId = searchParams.get("customerId") || undefined;
            const result = await orderService.getAllOrders(
                page,
                size,
                filters.q,  // query
                undefined,  // orderId
                undefined,  // customerName
                customerId,
                statusFilter,
                effectiveStartDate,
                effectiveEndDate,
            );
            setAllOrdersOnPage(result.content);
            setSelectedOrders([]);
            return result;
        },
        [refreshKey, activeTab],
    );

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await orderService.updateOrderStatus(orderId, newStatus);
            toast.success("Estado del pedido actualizado");
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(
                getErrorMessage(err, "¡El estado se nos resiste!"),
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
                closeOrderDetail();
            }
        } catch (err) {
            toast.error(getErrorMessage(err, "¡El pedido no quiere ser cancelado!"));
        } finally {
            setIsCanceling(false);
            setOrderToCancel(null);
        }
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        try {
            await orderService.deleteOrder(orderToDelete.id);
            toast.success(`Pedido #${orderToDelete.id} eliminado`);
            setRefreshKey((prev) => prev + 1);
            if (selectedOrder?.id === orderToDelete.id) {
                closeOrderDetail();
            }
        } catch (err) {
            toast.error(getErrorMessage(err, "No se pudo eliminar el pedido"));
        } finally {
            setIsDeleting(false);
            setOrderToDelete(null);
        }
    };

    const openEditor = (order: Order | null) => {
        setEditorOrder(order);
    };

    const handleReceiptUploaded = async (file: FileRecord) => {
        if (!uploadReceiptOrder) return;
        setIsUploadingReceipt(true);
        try {
            const updated = await orderService.adminUploadReceipt(uploadReceiptOrder.id, file.id);
            if (selectedOrder?.id === updated.id) {
                setSelectedOrder(updated);
            }
            toast.success("Justificante subido correctamente");
            setUploadReceiptOrder(null);
            setRefreshKey((prev) => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, "¡El justificante se nos resiste!"));
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedOrders.length === 0) {
            toast.error("¡Elige al menos un pedido primero!");
            return;
        }
        if (!bulkStatus) {
            toast.error("¡Falta elegir un estado!");
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
            toast.error(getErrorMessage(err, "¡Los pedidos no cooperan con la actualización!"));
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

    const REPORT_TYPE_LABELS: Record<ExportReportType, string> = {
        FULL: 'Informe completo',
        FACTORY: 'Hoja de fabricación',
        WAREHOUSE: 'Hoja de almacén',
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            await exportService.exportOrders(selectedDropIds, reportType);

            const dropsLabel = selectedDropIds.length > 0 ? `${selectedDropIds.length} colecciones seleccionadas` : 'todas las colecciones';
            toast.success(`${REPORT_TYPE_LABELS[reportType]} generado (${dropsLabel})`);
            setIsExportModalOpen(false);
            setReportType('FULL');
        } catch (err) {
            toast.error(getErrorMessage(err, "¡El Excel se nos atragantó!"));
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
                        className="w-4 h-4 text-yambo-green-600 rounded focus:ring-2 focus:ring-yambo-green-500/50 cursor-pointer"
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
                    className="w-4 h-4 text-yambo-green-600 rounded focus:ring-2 focus:ring-yambo-green-500/50 cursor-pointer"
                />
            ),
        },
        {
            key: "id",
            header: "ID",
            className: "hidden md:table-cell",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por ID...",
            },
            render: (order: Order) => (
                <span className="font-mono text-xs text-gray-400">{order.id}</span>
            ),
        },
        {
            key: "customerName",
            header: "Cliente",
            filter: {
                enabled: true,
                type: "search",
                placeholder: "Buscar por nombre...",
            },
            render: (order: Order) => (
                <div className="text-xs">
                    <p className="font-medium text-yambo-black">{order.user?.name || "N/A"}</p>
                    <p className="text-gray-400 text-xs">
                        {order.user?.email || ""}
                    </p>
                    <p className="text-gray-400 text-xs md:hidden font-mono truncate max-w-[120px]">{order.id}</p>
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
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                config?.className || "bg-gray-100 text-gray-800"
                            }`}
                        >
                            {config?.shortLabel || order.status}
                        </span>
                        {order.hasOpenIssues && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                Inc. Pendientes
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "dateRange",
            header: "Fecha",
            className: "hidden md:table-cell",
            filter: {
                enabled: true,
                type: "date-range",
            },
            render: (order: Order) => (
                <span className="text-sm text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "products",
            header: "Productos",
            className: "hidden sm:table-cell",
            render: (order: Order) => (
                <span className="text-sm text-gray-400">
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
                    <span className="text-sm font-bold text-yambo-black">
                        {total.toFixed(2)} €
                    </span>
                );
            },
        },
        {
            key: "actions",
            header: "Acciones",
            requiredPerms: [{ obj: "order", action: "update" }],
            render: (order: Order) => (
                <div className="flex items-center gap-2">
                    {(() => {
                        const transitions = ORDER_WORKFLOW_TRANSITIONS[order.status as OrderStatus] || [];
                        const currentConfig = ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG];
                        return transitions.length > 0 ? (
                            <select
                                value={order.status}
                                onChange={(e) =>
                                    handleStatusChange(order.id, e.target.value)
                                }
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50"
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
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${currentConfig?.className || "bg-gray-100 text-gray-800"}`}>
                                {currentConfig?.shortLabel || order.status}
                            </span>
                        );
                    })()}
                    <button type="button"
                        onClick={() => openOrderDetail(order)}
                        className="text-yambo-green-600 hover:text-yambo-green-700 text-xs font-medium transition-colors"
                        title="Ver detalles"
                    >
                        Ver
                    </button>
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <button type="button"
                            onClick={() => setUploadReceiptOrder(order)}
                            className="text-yambo-green-600 hover:text-yambo-green-700 text-xs font-medium transition-colors"
                            title={order.receiptFileId ? "Reemplazar justificante" : "Subir justificante"}
                        >
                            <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-1" />
                            {order.receiptFileId ? "Reemplazar" : "Justificante"}
                        </button>
                    )}
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <button type="button"
                            onClick={() => setOrderToCancel(order)}
                            className="text-coral hover:text-red-700 text-xs font-medium transition-colors"
                            title="Cancelar pedido"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            ),
        },
    ];
    return (
        <RequirePermission
            permission={{ obj: "order", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <PageContainer>
                <PageHeader
                    title="Pedidos"
                    description="Gestiona y exporta todos los pedidos de la plataforma."
                    wiki={{ slug: "flujos-de-trabajo", hash: "pedidos" }}
                    actions={
                        <div className="flex items-center gap-3">
                            {hasPermission({ obj: "order", action: "create" }) && (
                                <ButtonComponent
                                    variant="secondary"
                                    onClick={() => setEditorOrder(null)}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                                    Nuevo pedido
                                </ButtonComponent>
                            )}
                            <ButtonComponent
                                variant="primary"
                                onClick={() => setIsExportModalOpen(true)}
                                disabled={isExporting}
                            >
                                <FontAwesomeIcon icon={faFileExport} className="w-5 h-5" />
                                Exportar a Excel
                            </ButtonComponent>
                        </div>
                    }
                />

                <ViewTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); }} />

                {/* Bulk Actions Toolbar */}
                <BulkActionsToolbar
                    selectedOrders={selectedOrders}
                    allOrdersOnPage={allOrdersOnPage}
                    bulkStatus={bulkStatus}
                    onBulkStatusChange={setBulkStatus}
                    onClearSelection={() => setSelectedOrders([])}
                    onApplyStatus={handleBulkStatusUpdate}
                />

                {/* URL filter indicators */}
                {searchParams.get("customerId") && (
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <span className="text-xs text-gray-400 font-medium">Filtros activos:</span>
                        <span className="inline-flex items-center gap-1.5 bg-yambo-green-50 text-yambo-green-700 rounded-full px-3 py-1 text-xs font-medium">
                            <FontAwesomeIcon icon={faUser} className="w-3 h-3" />
                            {(() => {
                                const customerId = searchParams.get("customerId")!;
                                const matchedOrder = allOrdersOnPage.find(o => o.user?.id === customerId);
                                return matchedOrder?.user?.name || customerId;
                            })()}
                            <button type="button"
                                onClick={() => {
                                    const next = new URLSearchParams(searchParams);
                                    next.delete("customerId");
                                    setSearchParams(next, { replace: true });
                                }}
                                className="ml-0.5 text-yambo-green-500 hover:text-yambo-green-800 transition-colors"
                                title="Quitar filtro"
                            >
                                <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                            </button>
                        </span>
                    </div>
                )}

                <FilterableTable
                    columns={orderTableColumns}
                    keyField="id"
                    display={{
                        emptyMessage: "No se encontraron pedidos",
                        loadingMessage: "Cargando pedidos...",
                        renderMobileCard: (order: Order) => {
                            const config =
                                ORDER_STATUS_CONFIG[
                                    order.status as keyof typeof ORDER_STATUS_CONFIG
                                ];
                            const total =
                                order.products?.reduce(
                                    (sum, p) => sum + p.price * p.quantity,
                                    0,
                                ) || 0;
                            const productCount =
                                order.products?.reduce(
                                    (sum, p) => sum + p.quantity,
                                    0,
                                ) || 0;
                            return (
                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-medium text-yambo-black truncate">
                                                {order.user?.name || "N/A"}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {order.user?.email || ""}
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleOrderSelection(order.id)}
                                            className="w-4 h-4 text-yambo-green-600 rounded focus:ring-2 focus:ring-yambo-green-500/50 cursor-pointer shrink-0"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                config?.className || "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {config?.shortLabel || order.status}
                                        </span>
                                        {order.hasOpenIssues && (
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                                                Inc. Pendientes
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="text-gray-400 text-xs">
                                            {new Date(order.createdAt).toLocaleDateString()} · {productCount} productos
                                        </span>
                                        <span className="font-bold text-yambo-black">
                                            {total.toFixed(2)} €
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button type="button"
                                            onClick={() => openOrderDetail(order)}
                                            className="text-yambo-green-600 hover:text-yambo-green-700 text-xs font-medium transition-colors"
                                        >
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            );
                        },
                    }}
                    features={{ enableLoadMore: true, globalSearch: true }}
                    serverSide={{ fetchData: fetchOrdersData }}
                />
            </PageContainer>

            <ExportOrdersModal
                isOpen={isExportModalOpen}
                isExporting={isExporting}
                reportType={reportType}
                onReportTypeChange={setReportType}
                selectedDropIds={selectedDropIds}
                onSelectedDropIdsChange={setSelectedDropIds}
                drops={drops}
                onClose={() => {
                    setIsExportModalOpen(false);
                    setReportType('FULL');
                }}
                onExport={exportToExcel}
            />

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    receiptFileUrl={receiptFileUrl}
                    isMerchAdmin={isMerchAdmin}
                    products={products}
                    drops={drops}
                    selectedOrderIssues={selectedOrderIssues}
                    onClose={closeOrderDetail}
                    onStatusChange={handleStatusChange}
                    onOrderUpdated={(order) => setSelectedOrder(order)}
                    onUploadReceipt={setUploadReceiptOrder}
                    onRequestCancel={setOrderToCancel}
                    onOpenIssueWindow={openIssueWindow}
                    onViewIssue={(issueId) => {
                        closeOrderDetail();
                        navigate(`/mi-espacio/incidencias/${issueId}`);
                    }}
                    canEdit={hasPermission({ obj: "order", action: "update" })}
                    canDelete={hasPermission({ obj: "order", action: "delete" })}
                    onEdit={(order) => openEditor(order)}
                    onDelete={(order) => setOrderToDelete(order)}
                />
            )}
            {/* Create Issue Modal (Merch Admin) */}
            <CreateIssueModal
                issueWindow={issueWindow}
                onClose={() => setIssueWindow(null)}
                onSuccess={() => {
                    const orderId = issueWindow?.orderId;
                    setIssueWindow(null);
                    if (orderId) {
                        issueService.getIssuesByOrder(orderId)
                            .then(setSelectedOrderIssues)
                            .catch(() => {});
                    }
                }}
            />

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

            {/* Upload Receipt Modal */}
            <UploadReceiptModal
                order={uploadReceiptOrder}
                isUploading={isUploadingReceipt}
                onUploaded={handleReceiptUploaded}
                onRequestClose={() => setUploadReceiptOrder(null)}
            />

            {/* Order Editor Modal (crear/editar) */}
            <OrderEditorModal
                order={editorOrder !== undefined ? editorOrder : null}
                isOpen={editorOrder !== undefined}
                onClose={() => setEditorOrder(undefined)}
                onSaved={() => setRefreshKey((prev) => prev + 1)}
            />

            {/* Delete Order Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!orderToDelete}
                onClose={() => setOrderToDelete(null)}
                onConfirm={handleDeleteOrder}
                title="¿Eliminar pedido?"
                message={`¿Estás seguro de que quieres eliminar el pedido #${orderToDelete?.id ?? ""}? Esta acción no se puede deshacer.`}
                confirmLabel="Sí, eliminar"
                cancelLabel="Volver"
                variant="danger"
                isLoading={isDeleting}
            />
        </RequirePermission>

    );
}
