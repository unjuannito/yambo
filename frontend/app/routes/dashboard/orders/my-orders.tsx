import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { orderService, type Order } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { issueService } from "~/services/issueService";
import type { Issue, IssueReportWindowModel } from "~/types/issueType";
import type { FileRecord } from "~/types/fileType";
import { getIssueOrderedProductIds, formatConfiguration } from "~/utils/issueUtils";
import { getErrorMessage } from "~/types/error";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import FileUploader from "~/components/common/FileUploader";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import type { Route } from "./+types/my-orders";
import { ORDER_STATUS_CONFIG, ORDER_WORKFLOW_TRANSITIONS } from "~/constants/orderStatus";
import { StatusWorkflow } from "~/components/common/StatusWorkflow";
import PaymentInstructions from "~/components/shop/PaymentInstructions";
import { IssueStatusBadge, IssueForm } from "~/components/issues";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faTriangleExclamation, faUpload, faClock } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mis Pedidos" },
    { name: "description", content: "Historial de mis pedidos" },
  ];
}

export default function MyOrdersPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTab, setActiveTab } = useViewTab("actual");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drops, setDrops] = useState<FamilyProduct[]>([]);
  const [orderIssues, setOrderIssues] = useState<Record<string, Issue[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedOrderTotal, setSelectedOrderTotal] = useState<number>(0);
  const [issueWindow, setIssueWindow] = useState<IssueReportWindowModel | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [uploadReceiptOrder, setUploadReceiptOrder] = useState<Order | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const statusFilterOptions = Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => ({
    value: key,
    label: config.label,
  }));

  useEffect(() => {
    if (isAuthenticated()) {
      loadOrders();
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId && orders.length > 0 && !orderDetail) {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        setOrderDetail(order);
        searchParams.delete("orderId");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [orders, searchParams]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
      const [ordersResponse, productsResponse, dropsResponse] = await Promise.all([
        orderService.getMyOrders(0, 200, startDate),
        productService.getAllProducts(0, 200),
        familyProductService.listFamilyProducts(0, 200),
      ]);
      setOrders(ordersResponse.content);
      setProducts(productsResponse.content);
      setDrops(dropsResponse.content);

      await loadIssuesForOrders(ordersResponse.content);
    } catch (err) {
      setError(getErrorMessage(err, "Error al cargar los pedidos"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadIssuesForOrders = async (ordersList: Order[]) => {
    const results = await Promise.allSettled(
      ordersList.map(async (order) => {
        const issues = await issueService.getIssuesByOrder(order.id);
        return { orderId: order.id, issues };
      })
    );

    const issuesMap: Record<string, Issue[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.issues.length > 0) {
        issuesMap[result.value.orderId] = result.value.issues;
      }
    }

    setOrderIssues(issuesMap);
  };

  const handleIssueCreated = async () => {
    setIssueWindow(null);
    if (orders.length > 0) {
      await loadIssuesForOrders(orders);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    setCancelingOrderId(orderToCancel.id);
    try {
      const updated = await orderService.cancelMyOrder(orderToCancel.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (orderDetail?.id === updated.id) {
        setOrderDetail(updated);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Error al cancelar el pedido"));
    } finally {
      setCancelingOrderId(null);
      setOrderToCancel(null);
    }
  };

  const handleReceiptUploaded = async (file: FileRecord) => {
    if (!uploadReceiptOrder) return;
    setIsUploadingReceipt(true);
    try {
      const updated = await orderService.uploadReceipt(uploadReceiptOrder.id, file.id);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (orderDetail?.id === updated.id) {
        setOrderDetail(updated);
      }
      toast.success("Justificante subido correctamente. Estamos verificando tu pago.");
      setUploadReceiptOrder(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al subir el justificante"));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const openIssueWindow = (order: Order, preselectedOrderedProductId?: string) => {
    const orderedProducts = order.products.map((product) => ({
      id: product.id,
      name: product.productName || product.productId,
      configuration: product.configuration,
      quantity: product.quantity,
      unitPrice: product.price,
    }));

    if (orderedProducts.length === 0) {
      return;
    }

    setIssueWindow({
      orderId: order.id,
      orderedProducts,
      initialSelectedOrderedProductIds: preselectedOrderedProductId ? [preselectedOrderedProductId] : undefined,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleShowPaymentInstructions = (order: Order) => {
    const total = order.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    setSelectedOrderId(order.id);
    setSelectedOrderTotal(total);
    setShowPaymentInstructions(true);
  };

  const handleClosePaymentInstructions = () => {
    setShowPaymentInstructions(false);
    setSelectedOrderId("");
    setSelectedOrderTotal(0);
  };

  const getOrderTotal = (order: Order) => {
    return order.products.reduce((total, product) => total + (product.price * product.quantity), 0);
  };

  const getProductDrop = (productId: string) => {
    const productData = products.find((item) => item.id === productId);
    if (!productData?.familyProductId) {
      return null;
    }

    return drops.find((drop) => drop.id === productData.familyProductId) || null;
  };

  return (
    <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
        <p className="text-gray-600">Resumen de tus pedidos y sus incidencias</p>
      </div>

      <StatusWorkflow
        title="Flujo de estados del pedido"
        config={ORDER_STATUS_CONFIG}
        transitions={ORDER_WORKFLOW_TRANSITIONS}
      />

      <ViewTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mb-4">
        <MultiSelectComponent
          label="Filtrar por estado"
          options={statusFilterOptions}
          value={selectedStatuses}
          placeholder="Todos los estados"
          onChange={(e) => {
            const selected = Array.from(
              (e.target as HTMLSelectElement).selectedOptions,
              (opt) => opt.value
            );
            setSelectedStatuses(selected);
          }}
        />
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" message="Cargando pedidos..." />
        </div>
      )}

      {error && (
        <ErrorMessage message={error} onRetry={loadOrders} className="mb-6" />
      )}

      {!isLoading && !error && orders.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FontAwesomeIcon
            icon={faClipboard}
            className="w-24 h-24 mx-auto mb-4 text-gray-400"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No tienes pedidos aún</h2>
          <p className="text-gray-600 mb-6">Explora nuestro merch y realiza tu primer pedido</p>
          <button
            onClick={() => navigate("/mi-espacio/merch")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al merch
          </button>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="grid gap-4">
          {orders
            .filter((order) => selectedStatuses.length === 0 || selectedStatuses.includes(order.status))
            .map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Pedido <span className="font-mono font-medium text-gray-900">#{order.id}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {order.hasOpenIssues && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                      Incidencias Pendientes
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.className || "bg-gray-100 text-gray-800"
                  }`}>
                    {ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.label || order.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Productos</p>
                  <p className="text-lg font-semibold text-gray-900">{order.products.length}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Incidencias</p>
                  <p className="text-lg font-semibold text-gray-900">{orderIssues[order.id]?.length || 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-900">{getOrderTotal(order).toFixed(2)} €</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setOrderDetail(order)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ver detalles
                </button>
                {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                  <button
                    onClick={() => handleShowPaymentInstructions(order)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Instrucciones de pago
                  </button>
                )}
                {order.status === "PENDING_PAYMENT" && (
                  <button
                    onClick={() => setUploadReceiptOrder(order)}
                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                    Subir justificante
                  </button>
                )}
                {order.status === "CONFIRMING_PAYMENT" && (
                  <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                    Verificando justificante...
                  </span>
                )}
                {order.status === "PENDING_PAYMENT" && (
                  <button
                    onClick={() => setOrderToCancel(order)}
                    disabled={cancelingOrderId === order.id}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {cancelingOrderId === order.id ? "Cancelando..." : "Cancelar pedido"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!orderDetail}
        onClose={() => setOrderDetail(null)}
        title={orderDetail ? `Pedido #${orderDetail.id}` : "Pedido"}
        size="lg"
      >
        {orderDetail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Creado el {formatDate(orderDetail.createdAt)}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openIssueWindow(orderDetail)}
                  disabled={!!issueWindow}
                  className="px-3 py-1 text-sm text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Nueva incidencia (varios productos)
                </button>
                {orderDetail.hasOpenIssues && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    Incidencias Pendientes
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ORDER_STATUS_CONFIG[orderDetail.status as keyof typeof ORDER_STATUS_CONFIG]?.className || "bg-gray-100 text-gray-800"
                }`}>
                  {ORDER_STATUS_CONFIG[orderDetail.status as keyof typeof ORDER_STATUS_CONFIG]?.label || orderDetail.status}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {orderDetail.products.map((product, idx) => {
                const productDrop = getProductDrop(product.productId);
                const productIssues = orderIssues[orderDetail.id]?.filter(
                  (issue) => getIssueOrderedProductIds(issue).includes(product.id),
                ) || [];
                const hasIssue = productIssues.length > 0;

                return (
                  <div key={`${orderDetail.id}-${product.productId}-${idx}`} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.productName || product.productId}</p>
                        {productDrop && (
                          <div className="mt-1 mb-2">
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium text-xs">
                              {productDrop.name}
                            </span>
                            {productDrop.endTms && (
                              <span className="text-xs text-gray-600 ml-2">
                                Disponible hasta: {new Date(productDrop.endTms).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        )}

                        {product.configuration && product.configuration !== "{}" && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Configuración:</span> {formatConfiguration(product.configuration)}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Cantidad: {product.quantity}</span>
                          <span>•</span>
                          <span className="font-medium text-blue-600">{product.price.toFixed(2)} € c/u</span>
                        </div>

                        {hasIssue ? (
                          <div className="mt-3 flex items-center gap-2">
                            <IssueStatusBadge status={productIssues[0].status} />
                            <button
                              onClick={() => navigate(`/mi-espacio/incidencias/${productIssues[0].id}`)}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Ver incidencia
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openIssueWindow(orderDetail, product.id)}
                            disabled={!!issueWindow}
                            className="mt-3 text-sm text-orange-600 hover:text-orange-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
                            Reportar incidencia
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-lg font-bold text-gray-900">
                          {(product.price * product.quantity).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                </div>
                );
              })}
            </div>

            {orderDetail.status === "PENDING_PAYMENT" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ver instrucciones de pago
                </button>
                <button
                  onClick={() => setUploadReceiptOrder(orderDetail)}
                  className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                  Subir justificante
                </button>
                <button
                  onClick={() => setOrderToCancel(orderDetail)}
                  disabled={cancelingOrderId === orderDetail.id}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {cancelingOrderId === orderDetail.id ? "Cancelando..." : "Cancelar pedido"}
                </button>
              </div>
            )}
            {orderDetail.status === "CONFIRMING_PAYMENT" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ver instrucciones de pago
                </button>
                <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                  Verificando justificante...
                </span>
              </div>
            )}

            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-700 font-medium">Total del pedido</span>
              <span className="text-2xl font-bold text-gray-900">
                {getOrderTotal(orderDetail).toFixed(2)} €
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Instructions Modal */}
      {showPaymentInstructions && selectedOrderId && (
        <PaymentInstructions
          orderId={selectedOrderId}
          totalAmount={selectedOrderTotal}
          onClose={handleClosePaymentInstructions}
        />
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
        isLoading={!!cancelingOrderId}
      />

      {/* Issue Report Modal */}
      <Modal
        isOpen={!!issueWindow}
        onClose={() => setIssueWindow(null)}
        title={issueWindow ? `Nueva incidencia · Pedido #${issueWindow.orderId}` : "Nueva incidencia"}
        size="md"
      >
        {issueWindow && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona uno o varios productos de este pedido para asociarlos a la incidencia.
            </p>
            <IssueForm
              orderedProducts={issueWindow.orderedProducts}
              initialSelectedOrderedProductIds={issueWindow.initialSelectedOrderedProductIds}
              onSuccess={handleIssueCreated}
              onCancel={() => setIssueWindow(null)}
            />
          </>
        )}
      </Modal>

      {/* Upload Receipt Modal */}
      <Modal
        isOpen={!!uploadReceiptOrder}
        onClose={() => !isUploadingReceipt && setUploadReceiptOrder(null)}
        title={uploadReceiptOrder ? `Subir justificante · Pedido #${uploadReceiptOrder.id}` : "Subir justificante"}
        size="md"
      >
        {uploadReceiptOrder && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Sube el justificante de la transferencia bancaria para el pedido{" "}
                <strong>#{uploadReceiptOrder.id}</strong>. Una vez recibido,
                nuestro equipo verificará el pago.
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

            <div className="text-xs text-gray-500">
              Formatos aceptados: imágenes (JPG, PNG) y PDF. Tamaño máximo: 10 MB.
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}


