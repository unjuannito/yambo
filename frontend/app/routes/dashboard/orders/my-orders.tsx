import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { orderService, type Order } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import type { Route } from "./+types/my-orders";
import { ORDER_STATUS_CONFIG } from "~/constants/orderStatus";
import PaymentInstructions from "~/components/shop/PaymentInstructions";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedOrderTotal, setSelectedOrderTotal] = useState<number>(0);

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
    } catch (err: any) {
      console.error("Error loading orders:", err);
      setError(err.response?.data?.message || "Error al cargar los pedidos");
    } finally {
      setIsLoading(false);
    }
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

  const formatConfiguration = (configStr: string) => {
    try {
      const config = JSON.parse(configStr);
      return Object.entries(config)
        .map(([key, value]) => {
          if (typeof value === 'boolean') {
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

  return (
    <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
        <p className="text-gray-600">Historial completo de tus pedidos</p>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando pedidos...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadOrders}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Reintentar
          </button>
        </div>
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
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Pedido <span className="font-mono font-medium text-gray-900">#{order.id}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.className || 'bg-gray-100 text-gray-800'
                    }`}>
                      {ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.label || order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Products */}
              <div className="px-6 py-4">
                {order.products && order.products.length > 0 ? (
                  <div className="space-y-4">
                    {order.products.map((product, idx) => {
                      const productData = products.find(p => p.id === product.productId);
                      const productDrop = productData?.familyProductId 
                        ? drops.find(drop => drop.id === productData.familyProductId)
                        : null;
                      
                      return (
                        <div key={`${order.id}-${product.productId}-${idx}`} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {product.productName || product.productId}
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
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Subtotal</p>
                            <p className="text-lg font-bold text-gray-900">
                              {(product.price * product.quantity).toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Sin productos</p>
                )}
              </div>

              {/* Order Total */}
              {order.products && order.products.length > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total del pedido</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {order.products.reduce((total, p) => total + (p.price * p.quantity), 0).toFixed(2)} €
                    </span>
                  </div>
                  
                  {/* Payment Instructions Button for Pending Orders */}
                  {order.status === 'PENDING_CONFIRMATION' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleShowPaymentInstructions(order)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ver instrucciones de pago
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Instructions Modal */}
      {showPaymentInstructions && selectedOrderId && (
        <PaymentInstructions
          orderId={selectedOrderId}
          totalAmount={selectedOrderTotal}
          onClose={handleClosePaymentInstructions}
        />
      )}
    </main>
  );
}
