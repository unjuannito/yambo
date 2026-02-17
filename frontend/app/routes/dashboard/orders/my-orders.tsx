import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { orderService, type Order } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { issueService } from "~/services/issueService";
import type { Issue, IssueReportWindowModel } from "~/types/issueType";
import { getIssueOrderedProductIds, formatConfiguration } from "~/utils/issueUtils";
import { getErrorMessage } from "~/types/error";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import type { Route } from "./+types/my-orders";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";
import PaymentInstructions from "~/components/shop/PaymentInstructions";
import { IssueStatusBadge, IssueForm } from "~/components/issues";
import { Modal } from "~/components/common/Modal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Mis Pedidos" },
    { name: "description", content: "Historial de mis pedidos" },
  ];
}

export default function MyOrdersPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (isAuthenticated()) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersData, productsResponse, dropsResponse] = await Promise.all([
        orderService.getMyOrders(),
        productService.getAllProducts(0, 200),
        familyProductService.listFamilyProducts(0, 200),
      ]);
      setOrders(ordersData);
      setProducts(productsResponse.content);
      setDrops(dropsResponse.content);

      await loadIssuesForOrders(ordersData);
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

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

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
          <svg
            className="w-24 h-24 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
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
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Pedido <span className="font-mono font-medium text-gray-900">#{order.id}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.className || "bg-gray-100 text-gray-800"
                }`}>
                  {ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.label || order.status}
                </span>
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
                {order.status === "PENDING_CONFIRMATION" && (
                  <button
                    onClick={() => handleShowPaymentInstructions(order)}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Instrucciones de pago
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
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

            {orderDetail.status === "PENDING_CONFIRMATION" && (
              <button
                onClick={() => handleShowPaymentInstructions(orderDetail)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Ver instrucciones de pago
              </button>
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
    </main>
  );
}


