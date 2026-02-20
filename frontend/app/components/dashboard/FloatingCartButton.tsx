import { useCart } from "~/context/CartContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";

export default function FloatingCartButton() {
  const { getTotalItems, toggleCart } = useCart();
  const itemCount = getTotalItems();

  if (itemCount === 0) return null;

  return (
    <button
      onClick={toggleCart}
      className="fixed bottom-6 right-6 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
      aria-label="Abrir carrito"
    >
      <FontAwesomeIcon icon={faBagShopping} className="w-7 h-7" />

      {/* Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}
