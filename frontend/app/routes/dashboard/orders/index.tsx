import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/orders";
import type { Order } from "~/services/orderService";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type {
    FilterableColumn,
    FetchDataParams,
} from "~/components/common/FilterableTable";
import { orderService } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Pedidos" },
        { name: "Yambo - Pedidos", content: "Yambo - Pedidos" },
    ];
}

export default function Orders() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [allOrdersOnPage, setAllOrdersOnPage] = useState<Order[]>([]);
    const [bulkStatus, setBulkStatus] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [drops, setDrops] = useState<FamilyProduct[]>([]);

    const [statusOptions] = useState([
        { value: "", label: "Todos" },
        ...Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => ({
            value: key,
            label: config.label,
        })),
    ]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [productsResponse, dropsResponse] = await Promise.all([
                    productService.getAllProducts(0, 500),
                    familyProductService.listFamilyProducts(0, 200),
                ]);
                setProducts(productsResponse.content);
                setDrops(dropsResponse.content);
            } catch (error) {
                console.error("Error loading products and drops:", error);
            }
        };


        loadData();
    }, []);
    const fetchOrdersData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            const result = await orderService.getAllOrders(
                page,
                size,
                filters.customerId,
                filters.status,
            );
            setAllOrdersOnPage(result.content);
            setSelectedOrders([]); // Clear selections when data changes
            return result;
        },
        [refreshKey],
    );

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await orderService.updateOrderStatus(orderId, newStatus);
            toast.success("Estado del pedido actualizado");
            setRefreshKey((prev) => prev + 1); // Refresh table
        } catch (error: any) {
            console.error("Error updating order status:", error);
            toast.error(
                error.response?.data?.message ||
                    "Error al actualizar el estado",
            );
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
        } catch (error: any) {
            console.error("Error updating orders:", error);
            toast.error("Error al actualizar los pedidos");
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
            // Fetch all orders without pagination
            const allOrders = await orderService.getAllOrders(0, 10000);

            // Prepare data for Excel
            const excelData = allOrders.content.flatMap((order) => {
                if (!order.products || order.products.length === 0) {
                    return [
                        {
                            "ID Pedido": order.id,
                            Cliente: order.user?.name || "N/A",
                            Email: order.user?.email || "",
                            Estado: order.status,
                            Fecha: new Date(order.createdAt).toLocaleString(
                                "es-ES",
                            ),
                            Producto: "",
                            Drop: "",
                            "Fin Drop": "",
                            Cantidad: 0,
                            Precio: 0,
                            Configuración: "",
                            Subtotal: 0,
                        },
                    ];
                }

                return order.products.map((product) => {
                    const productData = products.find(p => p.id === product.productId);
                    const productDrop = productData?.familyProductId
                        ? drops.find(drop => drop.id === productData.familyProductId)
                        : null;

                    return {
                        "ID Pedido": order.id,
                        Cliente: order.user?.name || "N/A",
                        Email: order.user?.email || "",
                        Estado: order.status,
                        Fecha: new Date(order.createdAt).toLocaleString("es-ES"),
                        Producto: product.productName || product.productId,
                        Drop: productDrop?.name || "",
                        "Fin Drop": productDrop?.endTms ? new Date(productDrop.endTms).toLocaleDateString('es-ES') : "",
                        Cantidad: product.quantity,
                        Precio: product.price,
                        Configuración: product.configuration || "",
                        Subtotal: product.price * product.quantity,
                    };
                });
            });

            // Create worksheet and workbook
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

            // Auto-size columns
            const maxWidth = excelData.reduce(
                (w, r) => Math.max(w, r["ID Pedido"]?.length || 0),
                10,
            );
            ws["!cols"] = [
                { wch: 10 }, // ID Pedido
                { wch: 20 }, // Cliente
                { wch: 25 }, // Email
                { wch: 20 }, // Estado
                { wch: 20 }, // Fecha
                { wch: 20 }, // Producto
                { wch: 15 }, // Drop
                { wch: 15 }, // Fin Drop
                { wch: 10 }, // Cantidad
                { wch: 10 }, // Precio
                { wch: 30 }, // Configuración
                { wch: 10 }, // Subtotal
            ];

            // Generate file
            const fileName = `pedidos_${new Date().toISOString().split("T")[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success(
                `Exportado ${allOrders.content.length} pedidos a Excel`,
            );
        } catch (error: any) {
            console.error("Error exporting to Excel:", error);
            toast.error("Error al exportar a Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const orderTableColumns: FilterableColumn<Order>[] = [
        {
            key: "checkbox",
            header: () => {
                const allSelected =
                    selectedOrders.length > 0 &&
                    selectedOrders.length === allOrdersOnPage.length;
                const someSelected =
                    selectedOrders.length > 0 &&
                    selectedOrders.length < allOrdersOnPage.length;

                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                            }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            title={
                                allSelected
                                    ? "Deseleccionar todos"
                                    : "Seleccionar todos los visibles"
                            }
                        />
                    </div>
                );
            },
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
                type: "select",
                placeholder: "Seleccionar estado...",
                options: statusOptions,
            },
            render: (order: Order) => {
                const config =
                    ORDER_STATUS_CONFIG[
                        order.status as keyof typeof ORDER_STATUS_CONFIG
                    ];
                return (
                    <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config?.className || "bg-gray-100 text-gray-800"
                        }`}
                    >
                        {config?.shortLabel || order.status}
                    </span>
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
                            order.status === "DELIVERED" ||
                            order.status === "CANCELLED"
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
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isExporting ? (
                            <>
                                <svg
                                    className="animate-spin h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Exportando...
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                Exportar a Excel
                            </>
                        )}
                    </button>
                </div>

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
                    serverSide={{ fetchData: fetchOrdersData }}
                />
            </main>

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
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
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
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RequirePermission>
    );
}
