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
import { getIssueOrderedProductIds } from "~/utils/issueUtils";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { exportService, type ExportReportType } from "~/services/exportService";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import type { IssueReportWindowModel } from "~/types/issueType";
import { IssueStatusBadge } from "~/components/issues/IssueStatusBadge";
import { CreateIssueModal } from "~/components/issues/CreateIssueModal";
import { useAuth } from "~/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExport, faXmark, faFileArrowDown, faUpload, faUser } from "@fortawesome/free-solid-svg-icons";
import FileUploader from "~/components/common/FileUploader";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import type { FileRecord } from "~/types/fileType";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

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
                    <button
                        onClick={() => openOrderDetail(order)}
                        className="text-yambo-green-600 hover:text-yambo-green-700 text-xs font-medium transition-colors"
                        title="Ver detalles"
                    >
                        Ver
                    </button>
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <button
                            onClick={() => setUploadReceiptOrder(order)}
                            className="text-yambo-green-600 hover:text-yambo-green-700 text-xs font-medium transition-colors"
                            title={order.receiptFileId ? "Reemplazar justificante" : "Subir justificante"}
                        >
                            <FontAwesomeIcon icon={faUpload} className="w-3 h-3 mr-1" />
                            {order.receiptFileId ? "Reemplazar" : "Justificante"}
                        </button>
                    )}
                    {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                        <button
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
            <main className="flex flex-col p-4 md:p-6 w-full">
                <PageHeader
                    title="Pedidos"
                    description="Gestiona y exporta todos los pedidos de la plataforma."
                    wiki={{ slug: "flujos-de-trabajo", hash: "pedidos" }}
                    actions={
                        <ButtonComponent
                            variant="primary"
                            onClick={() => setIsExportModalOpen(true)}
                            disabled={isExporting}
                        >
                            <FontAwesomeIcon icon={faFileExport} className="w-5 h-5" />
                            Exportar a Excel
                        </ButtonComponent>
                    }
                />

                <ViewTabs activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setRefreshKey((prev) => prev + 1); }} />

                {/* Bulk Actions Toolbar */}
                {selectedOrders.length > 0 && (
                    <div className="bg-yambo-green-50/50 border border-yambo-green-200 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-sm font-medium text-yambo-green-800 shrink-0">
                            {selectedOrders.length} pedido
                            {selectedOrders.length !== 1 ? "s" : ""}{" "}
                            seleccionado
                            {selectedOrders.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {(() => {
                                const selectedOrderObjects = allOrdersOnPage.filter(o => selectedOrders.includes(o.id));
                                const transitionSets = selectedOrderObjects.map(o => ORDER_WORKFLOW_TRANSITIONS[o.status as OrderStatus] || []);
                                const commonTransitions = transitionSets.length > 0
                                    ? transitionSets.reduce((common, curr) => common.filter(s => curr.includes(s)))
                                    : [];
                                return (
                                    <select
                                        value={bulkStatus}
                                        onChange={(e) => setBulkStatus(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50"
                                        disabled={commonTransitions.length === 0}
                                    >
                                        <option value="">
                                            {commonTransitions.length === 0
                                                ? "Sin transiciones comunes"
                                                : "Cambiar estado a..."}
                                        </option>
                                        {commonTransitions.map((status) => {
                                            const cfg = ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG];
                                            return (
                                                <option key={status} value={status}>
                                                    {cfg?.label || status}
                                                </option>
                                            );
                                        })}
                                    </select>
                                );
                            })()}
                            <ButtonComponent
                                variant="primary"
                                size="sm"
                                onClick={handleBulkStatusUpdate}
                                disabled={!bulkStatus}
                            >
                                Actualizar
                            </ButtonComponent>
                        </div>
                        <ButtonComponent
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrders([])}
                        >
                            Cancelar
                        </ButtonComponent>
                    </div>
                )}

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
                            <button
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
                                        <button
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
            </main>

            <Modal
                isOpen={isExportModalOpen}
                onClose={() => {
                    if (!isExporting) { setIsExportModalOpen(false); setReportType('FULL'); }
                }}
                title="Exportar pedidos"
                size="md"
                footer={
                    <>
                        <ButtonComponent
                            variant="secondary"
                            onClick={() => { setIsExportModalOpen(false); setReportType('FULL'); }}
                            disabled={isExporting}
                        >
                            Cancelar
                        </ButtonComponent>
                        <ButtonComponent
                            variant="primary"
                            onClick={exportToExcel}
                            isLoading={isExporting}
                        >
                            Exportar
                        </ButtonComponent>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    {/* Report type selector */}
                    <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">Tipo de informe</p>
                        <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
                            {([
                                { value: 'FULL',      label: 'Completo' },
                                { value: 'FACTORY',   label: 'Fábrica' },
                                { value: 'WAREHOUSE', label: 'Almacén' },
                            ] as { value: ExportReportType; label: string }[]).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setReportType(opt.value)}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                                        reportType === opt.value
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {reportType === 'FULL' && 'Informe detallado: cliente, precio, estado y configuración por pedido.'}
                            {reportType === 'FACTORY' && 'Solo configuraciones y cantidades agrupadas. Sin datos de clientes ni precios.'}
                            {reportType === 'WAREHOUSE' && 'Configuraciones agrupadas con columnas de validación en blanco (Recibido / OK / Notas).'}
                        </p>
                    </div>

                    <MultiSelectComponent
                        label="Filtrar por Colecciones"
                        value={selectedDropIds}
                        options={drops.map((drop) => ({
                            value: drop.id,
                            label: drop.name,
                        }))}
                        placeholder="Todas las colecciones"
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
                        Se excluyen automáticamente los pedidos pendientes de pago y cancelados.
                    </div>
                </div>
            </Modal>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={closeOrderDetail}
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
                                        {selectedOrder.id}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={closeOrderDetail}
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
                                        {selectedOrder.user?.name || "N/A"}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        <a
                                            href={`mailto:${selectedOrder.user?.email || ""}`}
                                        >
                                            {selectedOrder.user?.email || ""}
                                        </a>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">
                                        Estado
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {(() => {
                                            const transitions = ORDER_WORKFLOW_TRANSITIONS[selectedOrder.status as OrderStatus] || [];
                                            const currentConfig = ORDER_STATUS_CONFIG[selectedOrder.status as keyof typeof ORDER_STATUS_CONFIG];
                                            return transitions.length > 0 ? (
                                                <select
                                                    value={selectedOrder.status}
                                                    onChange={async (e) => {
                                                        await handleStatusChange(selectedOrder.id, e.target.value);
                                                        setSelectedOrder({ ...selectedOrder, status: e.target.value });
                                                    }}
                                                    className={`text-sm font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${currentConfig?.className || "bg-gray-100 text-gray-800"}`}
                                                >
                                                    <option value={selectedOrder.status}>
                                                        {currentConfig?.shortLabel || selectedOrder.status}
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
                                                    {currentConfig?.shortLabel || selectedOrder.status}
                                                </span>
                                            );
                                        })()}
                                        {selectedOrder.hasOpenIssues && (
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
                            {(selectedOrder.status === "PENDING_PAYMENT" || selectedOrder.status === "CONFIRMING_PAYMENT") && (
                                <div className="mb-6 pb-6 border-b border-gray-100">
                                    <p className="text-sm text-gray-400 mb-2">Justificante de pago</p>
                                    <div className="flex items-center gap-3">
                                        {selectedOrder.receiptFileId && receiptFileUrl && (
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
                                        <button
                                            onClick={() => setUploadReceiptOrder(selectedOrder)}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-yambo-green-50 text-yambo-green-700 rounded-xl hover:bg-yambo-green-100 transition-colors text-sm font-medium"
                                        >
                                            <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                                            {selectedOrder.receiptFileId ? "Reemplazar justificante" : "Subir justificante"}
                                        </button>
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
                                        <button
                                            onClick={() => openIssueWindow(selectedOrder)}
                                            className="text-sm text-orange-600 hover:text-orange-800 font-medium transition-colors"
                                        >
                                            + Nueva incidencia (varios productos)
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {selectedOrder.products &&
                                    selectedOrder.products.length > 0 ? (
                                        selectedOrder.products.map(
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
                                                        key={`${selectedOrder.id}-${product.productId}-${idx}`}
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
                                                                                <button
                                                                                    onClick={() => {
                                                                                        closeOrderDetail();
                                                                                        navigate(`/mi-espacio/incidencias/${issue.id}`);
                                                                                    }}
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
                                                                            onClick={() => openIssueWindow(selectedOrder, product.id)}
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
                                    <ButtonComponent
                                        variant="danger-text"
                                        size="sm"
                                        onClick={() => setOrderToCancel(selectedOrder)}
                                    >
                                        Cancelar pedido
                                    </ButtonComponent>
                                )}
                                <ButtonComponent
                                    variant="secondary"
                                    onClick={closeOrderDetail}
                                >
                                    Cerrar
                                </ButtonComponent>
                            </div>
                        </div>
                    </div>
                </div>
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
            <Modal
                isOpen={!!uploadReceiptOrder}
                onClose={() => !isUploadingReceipt && setUploadReceiptOrder(null)}
                title={uploadReceiptOrder ? `Subir justificante · Pedido #${uploadReceiptOrder.id}` : "Subir justificante"}
                size="md"
            >
                {uploadReceiptOrder && (
                    <div className="space-y-4">
                        <div className="bg-yambo-green-50/50 border border-yambo-green-100 rounded-2xl p-4">
                            <p className="text-sm text-yambo-green-800">
                                Sube el justificante de pago para el pedido{" "}
                                <strong>#{uploadReceiptOrder.id}</strong> del cliente{" "}
                                <strong>{uploadReceiptOrder.user?.name}</strong>.
                                El pedido pasará a estado &quot;Verificando pago&quot;.
                            </p>
                        </div>
                        {isUploadingReceipt ? (
                            <div className="text-center py-8">
                                <LoadingSpinner size="lg" message="Subiendo justificante..." />
                            </div>
                        ) : (
                            <FileUploader
                                onUpload={handleReceiptUploaded}
                                accept="image/*,application/pdf"
                                label="Justificante de pago"
                                maxSizeMb={10}
                            />
                        )}
                        <div className="text-xs text-gray-400">
                            Formatos aceptados: imágenes (JPG, PNG) y PDF. Tamaño máximo: 10 MB.
                        </div>
                    </div>
                )}
            </Modal>
        </RequirePermission>

    );
}
