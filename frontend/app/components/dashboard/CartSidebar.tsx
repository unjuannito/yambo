import { useCart } from "~/context/CartContext";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function CartSidebar() {
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice, isCartOpen, closeCart } = useCart();
  const navigate = useNavigate();

  const generateConfigKey = (configuration: Record<string, any>): string => {
    return JSON.stringify(
      Object.entries(configuration)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce((acc, [key, value]) => {
          // Extract ID from object if present, otherwise use value as-is
          acc[key] = (typeof value === 'object' && value !== null && 'id' in value) ? value.id : value;
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
        // If value is an object with label, use the label
        if (typeof value === 'object' && value !== null && 'label' in value) {
          return `${key}: ${value.label}`;
        }
        return `${key}: ${value}`;
      })
      .filter(Boolean)
      .join(", ");
  };

  const handleCheckout = () => {
    closeCart();
    navigate("/mi-espacio/cesta");
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          {items.length > 0 && (
            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que quieres vaciar la cesta?")) {
                  clearCart();
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FontAwesomeIcon
                icon={faBagShopping}
                className="w-16 h-16 text-gray-400 mb-4"
              />
              <p className="text-gray-600">Tu cesta está vacía</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const configKey = generateConfigKey(item.configuration);
                const configText = formatConfiguration(item.configuration);

                return (
                  <div key={`${item.product.id}-${configKey}`} className="border rounded-lg p-3">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.product.images && item.product.images.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Sin imagen</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-medium text-sm text-gray-900 truncate">
                            {item.product.name}
                          </h3>
                          <button
                            onClick={() => removeItem(item.product.id, configKey)}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
                          </button>
                        </div>

                        {configText && (
                          <p className="text-xs text-gray-500 mb-2 truncate">
                            {configText}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.price.toFixed(2)}€
                          </p>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, configKey, item.quantity - 1)}
                              className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-sm"
                            >
                              −
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, configKey, item.quantity + 1)}
                              className="w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{getTotalPrice().toFixed(2)}€</span>
            </div>
            <ButtonComponent
              variant="primary"
              className="w-full"
              onClick={handleCheckout}
            >
              Checkout ({getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''})
            </ButtonComponent>
          </div>
        )}
      </div>
    </>
  );
}
