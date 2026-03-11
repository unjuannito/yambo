import { useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useCart } from "~/context/CartContext";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { orderService } from "~/services/orderService";
import { familyProductService, type FamilyProduct } from "~/services/familyProductService";
import { useState, useEffect } from "react";
import type { Route } from "./+types/cart";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
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
  const [drops, setDrops] = useState<FamilyProduct[]>([]);

  useEffect(() => {
    const loadDrops = async () => {
      try {
        const response = await familyProductService.listFamilyProducts(0, 200);
        setDrops(response.content);
      } catch (err) {
        toast.error(getErrorMessage(err, "Error al cargar los drops"));
      }
    };

    loadDrops();
  }, []);

  const generateConfigKey = (configuration: Record<string, any>): string => {
    return JSON.stringify(
      Object.entries(configuration)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce((acc, [key, value]) => {
          acc[key] = (typeof value === 'object' && value !== null && 'id' in value) ? value.id : value;
          return acc;
        }, {} as Record<string, any>)
    );
  };

  const formatConfiguration = (configuration: Record<string, any>): string => {
    return Object.entries(configuration)
      .map(([key, value]) => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        if (typeof value === "boolean") {
          return value ? key : null;
        }
        if (typeof value === 'object' && value !== null && 'label' in value) {
          return `${key}: ${value.label}`;
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
        const normalizedConfig = Object.entries(item.configuration).reduce((acc, [key, value]) => {
          acc[key] = (typeof value === 'object' && value !== null && 'id' in value) ? value.id : value;
          return acc;
        }, {} as Record<string, any>);

        const configStr = JSON.stringify(normalizedConfig);
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

      setCompletedOrderId(response.id);
      setOrderTotal(totalPrice);

      clearCart();
      toast.success("¡Pedido realizado con éxito!");

      setShowPaymentInstructions(true);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Error al procesar el pedido");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePaymentInstructions = () => {
    setShowPaymentInstructions(false);
    navigate("/mi-espacio/mis-pedidos");
  };

  if (showPaymentInstructions && completedOrderId) {
    return (
      <>
        <main className="flex flex-col p-4 sm:p-8 w-full md:w-[calc(100vw-16rem)]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-extrabold font-display text-yambo-black mb-2">Procesando pedido...</h2>
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
      <main className="flex flex-col p-4 sm:p-8 w-full md:w-[calc(100vw-16rem)]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <FontAwesomeIcon
            icon={faBagShopping}
            className="w-24 h-24 mx-auto mb-4 text-gray-300"
          />
          <h2 className="text-2xl font-extrabold font-display text-yambo-black mb-2">Tu cesta está vacía</h2>
          <p className="text-gray-400 mb-6">Añade artículos desde el merch</p>
          <ButtonComponent variant="primary" onClick={() => navigate("/mi-espacio/merch")}>
            Ir al merch
          </ButtonComponent>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col p-4 sm:p-8 w-full md:w-[calc(100vw-16rem)]">
      <div className="mb-6">
        <button
          onClick={() => navigate("/mi-espacio/merch")}
          className="flex items-center px-4 py-2 text-gray-400 hover:text-yambo-black transition-colors font-medium"
        >
          ← Volver al merch
        </button>
      </div>

      <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">Tu Cesta</h1>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const configKey = generateConfigKey(item.configuration);
            const configText = formatConfiguration(item.configuration);
            const itemDrop = item.product.familyProductId
              ? drops.find(drop => drop.id === item.product.familyProductId)
              : null;

            return (
              <div key={`${item.product.id}-${configKey}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6">
                <div className="flex gap-3 sm:gap-6">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-32 sm:h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                        <span className="text-gray-400 text-xs sm:text-sm">Sin imagen</span>
                      </div>
                    )}
                  </div>

                  {/* Details + Subtotal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold font-display text-yambo-black">{item.product.name}</h3>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-400">Subtotal</p>
                        <p className="text-base sm:text-xl font-extrabold text-yambo-black whitespace-nowrap">
                          {(item.price * item.quantity).toFixed(2)} €
                        </p>
                      </div>
                    </div>

                    {itemDrop && (
                      <div className="mb-2">
                        <span className="inline-block bg-yambo-green-50 text-yambo-green-700 px-2.5 py-1 rounded-full font-medium text-xs">
                          {itemDrop.name}
                        </span>
                        {itemDrop.endTms && (
                          <p className="text-xs text-gray-400 mt-1">
                            Disponible hasta: {new Date(itemDrop.endTms).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {configText && (
                      <p className="text-xs sm:text-sm text-gray-400 mb-2">
                        <span className="font-medium text-gray-500">Configuración:</span> {configText}
                      </p>
                    )}

                    <p className="text-sm sm:text-lg font-extrabold text-yambo-green-600 mb-3 sm:mb-4">{item.price.toFixed(2)} €</p>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, configKey, item.quantity - 1)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-sm transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 sm:w-12 text-center font-medium text-sm sm:text-base text-yambo-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, configKey, item.quantity + 1)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-sm transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id, configKey)}
                        className="text-coral hover:text-red-700 text-xs sm:text-sm font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold font-display text-yambo-black mb-4">Resumen del pedido</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Artículos ({getTotalItems()})</span>
                <span className="font-medium text-yambo-black">{getTotalPrice().toFixed(2)} €</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between text-lg font-extrabold">
                <span className="text-yambo-black">Total</span>
                <span className="text-yambo-green-600">{getTotalPrice().toFixed(2)} €</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Coste sin beneficio para la asociación</p>
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
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
