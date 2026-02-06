import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useCart } from "~/context/CartContext";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { orderService } from "~/services/orderService";
import { useState } from "react";
import type { Route } from "./+types/cart";
import toast from "react-hot-toast";
import PaymentInstructions from "~/components/shop/PaymentInstructions";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Yambo - Cesta" },
    { name: "description", content: "Resumen de tu pedido" },
  ];
}

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string>("");
  const [orderTotal, setOrderTotal] = useState<number>(0);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const generateConfigKey = (configuration: Record<string, any>): string => {
    return JSON.stringify(
      Object.entries(configuration)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>)
    );
  };

  const formatConfiguration = (configuration: Record<string, any>): string => {
    return Object.entries(configuration)
      .map(([key, value]) => {
        // Skip empty values
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        if (typeof value === "boolean") {
          return value ? key : null;
        }
        return `${key}: ${value}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  const handleSubmitOrder = async () => {
    if (!isAuthenticated()) {
      toast.error("Error: Usuario no autenticado");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderProducts = items.map(item => {
        const configStr = JSON.stringify(item.configuration);
        return {
          productId: item.product.id,
          quantity: item.quantity,
          configuration: configStr && configStr !== '{}' && configStr !== 'null' ? configStr : undefined
        };
      });

      const totalPrice = getTotalPrice();
      const response = await orderService.createOrder({
        products: orderProducts
      });

      // Store order details for payment instructions
      setCompletedOrderId(response.id);
      setOrderTotal(totalPrice);

      clearCart();
      toast.success("¡Pedido realizado con éxito!");

      setShowPaymentInstructions(true);
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error.response?.data?.message || error.message || "Error al procesar el pedido";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePaymentInstructions = () => {
    setShowPaymentInstructions(false);
    navigate("/mi-espacio/mis-pedidos");
  };

  // Show payment instructions modal even if cart is empty (after completing order)
  if (showPaymentInstructions && completedOrderId) {
    return (
      <>
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Procesando pedido...</h2>
          </div>
        </main>
        <PaymentInstructions
          orderId={completedOrderId}
          totalAmount={orderTotal}
          onClose={handleClosePaymentInstructions}
        />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
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
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu cesta está vacía</h2>
          <p className="text-gray-600 mb-6">Añade artículos desde el merch</p>
          <ButtonComponent variant="primary" onClick={() => navigate("/mi-espacio/merch")}>
            Ir al merch
          </ButtonComponent>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
      <div className="mb-6">
        <button
          onClick={() => navigate("/mi-espacio/merch")}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Volver al merch
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Tu Cesta</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const configKey = generateConfigKey(item.configuration);
            const configText = formatConfiguration(item.configuration);

            return (
              <div key={`${item.product.id}-${configKey}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 text-sm">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.product.name}</h3>

                    {configText && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Configuración:</span> {configText}
                      </p>
                    )}

                    <p className="text-lg font-bold text-blue-600 mb-4">{item.price.toFixed(2)} €</p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, configKey, item.quantity - 1)}
                          className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, configKey, item.quantity + 1)}
                          className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id, configKey)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                    <p className="text-xl font-bold text-gray-900">
                      {(item.price * item.quantity).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen del pedido</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Artículos ({getTotalItems()})</span>
                <span className="font-medium">{getTotalPrice().toFixed(2)} €</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{getTotalPrice().toFixed(2)} €</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Coste sin beneficio para la asociación</p>
            </div>

            <ButtonComponent
              variant="primary"
              className="w-full mb-3"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Finalizar pedido"}
            </ButtonComponent>

            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que quieres vaciar la cesta?")) {
                  clearCart();
                }
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Vaciar cesta
            </button>
          </div>
        </div>
      </div>

      {/* Payment Instructions Modal */}
      {showPaymentInstructions && completedOrderId && (
        <PaymentInstructions
          orderId={completedOrderId}
          totalAmount={orderTotal}
          onClose={handleClosePaymentInstructions}
        />
      )}
    </main>
  );
}
