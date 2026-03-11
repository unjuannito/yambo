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
      className="fixed bottom-6 right-6 z-30 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:from-yambo-green-600 hover:to-yambo-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg shadow-yambo-green-500/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-yambo-green-500/40 animate-bounce-gentle"
      aria-label="Abrir carrito"
    >
      <FontAwesomeIcon icon={faBagShopping} className="w-7 h-7" />

      {/* Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
