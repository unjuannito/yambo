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
import PaymentInstructions from "~/components/shop/PaymentInstructions";
import { IssueStatusBadge } from "~/components/issues/IssueStatusBadge";
import { CreateIssueModal } from "~/components/issues/CreateIssueModal";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { ConfirmDeliveryButton } from "~/components/orders/ConfirmDeliveryButton";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faClipboard, faTriangleExclamation, faUpload, faClock, faChevronRight } from "@fortawesome/free-solid-svg-icons";
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
    setSelectedOrder(order);
    setShowPaymentInstructions(true);
  };

  const handleClosePaymentInstructions = () => {
    setShowPaymentInstructions(false);
    setSelectedOrderId("");
    setSelectedOrderTotal(0);
    setSelectedOrder(null);
  };

  const handleOpenTicketFromPayment = () => {
    if (!selectedOrder) return;
    setIssueWindow({
      orderId: selectedOrder.id,
      orderedProducts: selectedOrder.products.map((p) => ({
        id: p.id,
        name: p.productName || "Producto",
        configuration: p.configuration,
        quantity: p.quantity,
        unitPrice: p.price,
      })),
    });
    setShowPaymentInstructions(false);
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
    <main className="flex min-h-full flex-1 flex-col p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-2 flex items-center gap-2">
            <FontAwesomeIcon icon={faBox} className="text-yambo-green-500" />
            Mis Pedidos
        </h1>
      </div>

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
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <FontAwesomeIcon
            icon={faClipboard}
            className="w-24 h-24 mx-auto mb-4 text-gray-300"
          />
          <h2 className="text-2xl font-bold font-display text-yambo-black mb-2">No tienes pedidos aún</h2>
          <p className="text-gray-400 mb-6">Explora nuestros artículos y realiza tu primer pedido</p>
          <ButtonComponent
            variant="primary"
            onClick={() => navigate("/mi-espacio/articulos")}
          >
            Ir a los artículos
          </ButtonComponent>
        </div>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="grid gap-4">
          {orders
            .filter((order) => selectedStatuses.length === 0 || selectedStatuses.includes(order.status))
            .map((order) => {
              const total = getOrderTotal(order);
              const numProducts = order.products.length;
              const firstProduct = order.products[0];
              const firstProductName = firstProduct?.productName || firstProduct?.productId || "";
              const restCount = numProducts - 1;
              const issuesCount = orderIssues[order.id]?.length || 0;

              return (
            <div
              key={order.id}
              onClick={() => openOrderDetail(order)}
              className="bg-white rounded-xl border border-gray-100 p-3.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-[0.99]"
            >
              {/* Línea 1: ID + Total + Status + chevron */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-bold text-yambo-black truncate">#{order.id}</span>
                  <span className="text-xs text-gray-400 shrink-0">·</span>
                  <span className="text-sm font-bold text-yambo-green-600 shrink-0">{total.toFixed(2)} €</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.className || "bg-gray-100 text-gray-800"
                  }`}>
                    {ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.shortLabel || order.status}
                  </span>
                  <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 text-gray-300" />
                </div>
              </div>

              {/* Línea 2: Fecha + resumen de productos */}
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                <span>{new Date(order.createdAt).toLocaleDateString("es-ES")}</span>
                <span>·</span>
                <span className="truncate">
                  {firstProductName}
                  {restCount > 0
                    ? ` + ${restCount} ${restCount === 1 ? "producto" : "productos"}`
                    : ""}
                </span>
              </div>

              {/* Línea 3: Botones de acción compactos */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {(order.status === "PENDING_PAYMENT" || order.status === "CONFIRMING_PAYMENT") && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); handleShowPaymentInstructions(order); }}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Pago
                  </button>
                )}
                {order.status === "PENDING_PAYMENT" && (
                  <>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setUploadReceiptOrder(order); }}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faUpload} className="w-3 h-3" />
                      Justificante
                    </button>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setOrderToCancel(order); }}
                      disabled={cancelingOrderId === order.id}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {cancelingOrderId === order.id ? "..." : "Cancelar"}
                    </button>
                  </>
                )}
                {order.status === "CONFIRMING_PAYMENT" && (
                  <span className="text-xs text-orange-600 font-medium flex items-center gap-1 px-1">
                    <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    Verificando...
                  </span>
                )}
                {order.status === "PENDING_PRODUCTS" && (
                  <ConfirmDeliveryButton
                    orderId={order.id}
                    onConfirmed={handleOrderUpdated}
                  />
                )}
              </div>

              {/* Línea 4: Incidencias como texto plano (solo si hay) */}
              {order.hasOpenIssues && issuesCount > 0 && (
                <p className="mt-1.5 text-xs text-amber-600 font-medium flex items-center gap-1">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3" />
                  {issuesCount} {issuesCount === 1 ? "incidencia abierta" : "incidencias abiertas"}
                </p>
              )}
            </div>
              );
            })}
        </div>
      )}

      <Modal
        isOpen={!!orderDetail}
        onClose={closeOrderDetail}
        title={orderDetail ? `Pedido #${orderDetail.id}` : "Pedido"}
        size="lg"
      >
        {orderDetail && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm text-gray-400">Creado el {formatDate(orderDetail.createdAt)}</p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button type="button"
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
                  <div key={`${orderDetail.id}-${product.productId}-${idx}`} className="rounded-2xl border border-gray-100 p-3.5 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
                            {formatConfiguration(product.configuration)}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                          <span>Cantidad: {product.quantity}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium text-yambo-green-600">{product.price.toFixed(2)} € c/u</span>
                          <span className="hidden sm:inline">•</span>
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
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{issue.title}</span>
                                <button type="button"
                                  onClick={() => navigate(`/mi-espacio/incidencias/${issue.id}`)}
                                  className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium shrink-0"
                                >
                                  Ver incidencia
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => openIssueWindow(orderDetail, product.id)}
                            disabled={!!issueWindow}
                            className="mt-3 text-sm text-orange-600 hover:text-orange-800 disabled:text-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTriangleExclamation} className="w-4 h-4" />
                            Reportar incidencia
                          </button>
                        )}
                      </div>
                      <div className="min-w-[88px] self-start text-left sm:self-auto sm:text-right">
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonComponent
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="w-full sm:flex-1"
                >
                  Ver instrucciones de pago
                </ButtonComponent>
                <button type="button"
                  onClick={() => setUploadReceiptOrder(orderDetail)}
                  className="w-full px-4 py-2 bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors text-sm font-medium flex items-center justify-center gap-2 sm:w-auto"
                >
                  <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                  Subir justificante
                </button>
                <ButtonComponent
                  variant="danger-text"
                  size="sm"
                  onClick={() => setOrderToCancel(orderDetail)}
                  isLoading={cancelingOrderId === orderDetail.id}
                  className="w-full justify-center sm:w-auto"
                >
                  Cancelar pedido
                </ButtonComponent>
              </div>
            )}
            {orderDetail.status === "CONFIRMING_PAYMENT" && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonComponent
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowPaymentInstructions(orderDetail)}
                  className="w-full sm:flex-1"
                >
                  Ver instrucciones de pago
                </ButtonComponent>
                <span className="w-full px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium flex items-center justify-center gap-2 sm:w-auto sm:justify-start">
                  <FontAwesomeIcon icon={faClock} className="w-4 h-4" />
                  Verificando justificante...
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <span className="text-yambo-black font-medium">Total del pedido</span>
              <span className="text-xl font-bold text-yambo-green-600 sm:text-2xl">
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
          onOpenTicket={handleOpenTicketFromPayment}
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
