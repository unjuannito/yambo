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
import { IssueStatusBadge, CreateIssueModal } from "~/components/issues";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { ConfirmDeliveryButton } from "~/components/orders/ConfirmDeliveryButton";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboard, faTriangleExclamation, faUpload, faClock } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

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

  const closeOrderDetail = () => {
    if (searchParams.get("orderId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("orderId");
      setSearchParams(nextParams, { replace: true });
    }
    setOrderDetail(null);
  };

  const openOrderDetail = (order: Order) => {
    if (searchParams.get("orderId") !== order.id) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("orderId", order.id);
      setSearchParams(nextParams, { replace: true });
    }
    setOrderDetail(order);
  };

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
      setError(getErrorMessage(err, "¡Los pedidos no aparecen!"));
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
      setError(getErrorMessage(err, "¡El pedido no quiere ser cancelado!"));
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
      toast.error(getErrorMessage(err, "¡El justificante se nos resiste!"));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleOrderUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    if (orderDetail?.id === updated.id) {
      setOrderDetail(updated);
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
    <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-2">Mis Pedidos 📦</h1>
        <p className="text-gray-400">Resumen de tus pedidos y sus incidencias</p>
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
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FontAwesomeIcon
            icon={faClipboard}
            className="w-24 h-24 mx-auto mb-4 text-gray-300"
          />
          <h2 className="text-2xl font-bold font-display text-yambo-black mb-2">No tienes pedidos aún</h2>
          <p className="text-gray-400 mb-6">Explora nuestro merch y realiza tu primer pedido</p>
          <ButtonComponent
            variant="primary"
            onClick={() => navigate("/mi-espacio/merch")}
          >
            Ir al merch
          </ButtonComponent>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="grid gap-4">
          {orders
            .filter((order) => selectedStatuses.length === 0 || selectedStatuses.includes(order.status))
            .map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-400">
                    Pedido <span className="font-mono font-medium text-yambo-black">#{order.id}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
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
                <div className="rounded-xl bg-yambo-green-50/30 px-3 py-2">
                  <p className="text-xs text-gray-400">Productos</p>
                  <p className="text-lg font-semibold text-yambo-black">{order.products.length}</p>
                </div>
                <div className="rounded-xl bg-yambo-green-50/30 px-3 py-2">
                  <p className="text-xs text-gray-400">Incidencias</p>
                  <p className="text-lg font-semibold text-yambo-black">{orderIssues[order.id]?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-yambo-green-50/30 px-3 py-2">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-lg font-semibold text-yambo-green-600">{getOrderTotal(order).toFixed(2)} €</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonComponent
                  variant="primary"
                  size="sm"
                  onClick={() => openOrderDetail(order)}
                >
                  Ver detalles
                </ButtonComponent>
                {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                  <ButtonComponent
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShowPaymentInstructions(order)}
                  >
                    Instrucciones de pago
                  </ButtonComponent>
                )}
                {order.status === "PENDING_PAYMENT" && (
                  <button
                    onClick={() => setUploadReceiptOrder(order)}
                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                    Subir justificante
                  </button>
                )}
                {order.status === "CONFIRMING_PAYMENT" && (
                  <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                    Verificando justificante...
                  </span>
                )}
                {order.status === "PENDING_PAYMENT" && (
                  <ButtonComponent
                    variant="danger-text"
                    size="sm"
                    onClick={() => setOrderToCancel(order)}
                    isLoading={cancelingOrderId === order.id}
                  >
                    Cancelar pedido
                  </ButtonComponent>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!orderDetail}
        onClose={closeOrderDetail}
        title={orderDetail ? `Pedido #${orderDetail.id}` : "Pedido"}
        size="lg"
      >
        {orderDetail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-400">Creado el {formatDate(orderDetail.createdAt)}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openIssueWindow(orderDetail)}
                  disabled={!!issueWindow}
                  className="px-3 py-1 text-sm text-orange-700 bg-orange-100 rounded-full hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
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
                  <div key={`${orderDetail.id}-${product.productId}-${idx}`} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-yambo-black">{product.productName || product.productId}</p>
                        {productDrop && (
                          <div className="mt-1 mb-2">
                            <span className="inline-block bg-yambo-green-50 text-yambo-green-700 px-2 py-1 rounded-full font-medium text-xs">
                              {productDrop.name}
                            </span>
                            {productDrop.endTms && (
                              <span className="text-xs text-gray-400 ml-2">
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
                          <p className="text-sm text-gray-400 mt-1">
                            <span className="font-medium">Configuración:</span> {formatConfiguration(product.configuration)}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span>Cantidad: {product.quantity}</span>
                          <span>•</span>
                          <span className="font-medium text-yambo-green-600">{product.price.toFixed(2)} € c/u</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            ORDER_STATUS_CONFIG[product.status as keyof typeof ORDER_STATUS_CONFIG]?.className || "bg-gray-100 text-gray-800"
                          }`}>
                            {ORDER_STATUS_CONFIG[product.status as keyof typeof ORDER_STATUS_CONFIG]?.shortLabel || product.status}
                          </span>
                        </div>

                        {orderDetail.status === 'PENDING_PRODUCTS' && (
                          <ConfirmDeliveryButton
                            orderId={orderDetail.id}
                            onConfirmed={handleOrderUpdated}
                          />
                        )}
                        {hasIssue ? (
                          <div className="mt-3 flex flex-col gap-1">
                            {productIssues.map(issue => (
                              <div key={issue.id} className="flex items-center gap-2">
                                <IssueStatusBadge status={issue.status} />
                                <span className="text-sm text-gray-700 flex-1 truncate">{issue.title}</span>
                                <button
                                  onClick={() => navigate(`/mi-espacio/incidencias/${issue.id}`)}
                                  className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium shrink-0"
                                >
                                  Ver incidencia
                                </button>
                              </div>
                            ))}
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
                        <p className="text-sm text-gray-400">Subtotal</p>
                        <p className="text-lg font-bold text-yambo-black">
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
                <ButtonComponent
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="flex-1"
                >
                  Ver instrucciones de pago
                </ButtonComponent>
                <button
                  onClick={() => setUploadReceiptOrder(orderDetail)}
                  className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                  Subir justificante
                </button>
                <ButtonComponent
                  variant="danger-text"
                  size="sm"
                  onClick={() => setOrderToCancel(orderDetail)}
                  isLoading={cancelingOrderId === orderDetail.id}
                >
                  Cancelar pedido
                </ButtonComponent>
              </div>
            )}
            {orderDetail.status === "CONFIRMING_PAYMENT" && (
              <div className="flex gap-2">
                <ButtonComponent
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="flex-1"
                >
                  Ver instrucciones de pago
                </ButtonComponent>
                <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium flex items-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                  Verificando justificante...
                </span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-gray-100 pt-3">
              <span className="text-yambo-black font-medium">Total del pedido</span>
              <span className="text-2xl font-bold text-yambo-green-600">
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
      <CreateIssueModal
        issueWindow={issueWindow}
        onClose={() => setIssueWindow(null)}
        onSuccess={handleIssueCreated}
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
            <div className="bg-yambo-green-50/50 border border-yambo-green-100 rounded-xl p-4">
              <p className="text-sm text-yambo-green-800">
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

            <div className="text-xs text-gray-400">
              Formatos aceptados: imágenes (JPG, PNG) y PDF. Tamaño máximo: 10 MB.
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
