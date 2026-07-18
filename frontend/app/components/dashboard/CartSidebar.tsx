import { useTranslation } from "react-i18next";
import { useCart } from "~/context/CartContext";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faXmark } from "@fortawesome/free-solid-svg-icons";

export default function CartSidebar() {
  const { t } = useTranslation();
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isCartOpen,
    closeCart,
  } = useCart();
  const navigate = useNavigate();

  const generateConfigKey = (configuration: Record<string, any>): string => {
    return JSON.stringify(
      Object.entries(configuration)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce(
          (acc, [key, value]) => {
            acc[key] =
              typeof value === "object" && value !== null && "id" in value
                ? value.id
                : value;
            return acc;
          },
          {} as Record<string, any>
        )
    );
  };

  const formatConfiguration = (configuration: Record<string, any>): string => {
    return Object.entries(configuration)
      .map(([key, value]) => {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return null;
        }
        if (typeof value === "boolean") {
          return value ? key : null;
        }
        if (typeof value === "object" && value !== null && "label" in value) {
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={closeCart}
        role="presentation"
      />

      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col rounded-l-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-yambo-green-100/50">
          <h2 className="text-lg font-bold font-display">{t('merch.cartTitle')}</h2>
          {items.length > 0 && (
            <button
              onClick={() => {
                if (confirm(t('merch.clearCartConfirm'))) {
                  clearCart();
                }
              }}
              className="text-sm text-gray-500 hover:text-red-500 underline transition-colors"
            >
              {t('dashboard.clearAll')}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-yambo-green-50 rounded-2xl flex items-center justify-center mb-4">
                <FontAwesomeIcon
                  icon={faBagShopping}
                  className="w-10 h-10 text-yambo-green-300"
                />
              </div>
              <p className="text-gray-500 font-medium">{t('merch.emptyCart')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const configKey = generateConfigKey(item.configuration);
                const configText = formatConfiguration(item.configuration);

                return (
                  <div
                    key={`${item.product.id}-${configKey}`}
                    className="border border-gray-100 rounded-2xl p-3 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.product.images &&
                        item.product.images.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-yambo-green-50 rounded-xl flex items-center justify-center">
                            <span className="text-yambo-green-300 text-xs">
                              {t('merch.noImage')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">
                            <a
                              href={`/mi-espacio/articulos/${item.product.id}`}
                              className="text-gray-900 hover:text-yambo-green-600 transition-colors text-left"
                            >
                              {item.product.name}
                            </a>
                          </h3>
                          <button
                            onClick={() =>
                              removeItem(item.product.id, configKey)
                            }
                            className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors"
                          >
                            <FontAwesomeIcon
                              icon={faXmark}
                              className="w-4 h-4"
                            />
                          </button>
                        </div>

                        {configText && (
                          <p className="text-xs text-gray-400 mb-2 truncate">
                            {configText}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-yambo-green-600">
                            {item.price.toFixed(2)}€
                          </p>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  configKey,
                                  item.quantity - 1
                                )
                              }
                              className="w-7 h-7 rounded-full border border-gray-200 hover:bg-yambo-green-50 flex items-center justify-center text-sm transition-colors"
                            >
                              −
                            </button>
                            <span className="text-sm font-semibold w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  configKey,
                                  item.quantity + 1
                                )
                              }
                              className="w-7 h-7 rounded-full border border-gray-200 hover:bg-yambo-green-50 flex items-center justify-center text-sm transition-colors"
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
          <div className="border-t border-yambo-green-100/50 p-5 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('dashboard.total')}</span>
              <span className="text-yambo-green-600">
                {getTotalPrice().toFixed(2)}€
              </span>
            </div>
            <ButtonComponent
              variant="primary"
              className="w-full"
              onClick={handleCheckout}
            >
              {t('dashboard.checkout')} ({getTotalItems()} {t('merch.articles')})
            </ButtonComponent>
          </div>
        )}
      </aside>
    </>
  );
}
