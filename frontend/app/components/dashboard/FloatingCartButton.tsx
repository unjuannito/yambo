import { useCart } from "~/context/CartContext";

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
      {/* Cart Icon */}
      <svg
        className="w-7 h-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>

      {/* Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
}
