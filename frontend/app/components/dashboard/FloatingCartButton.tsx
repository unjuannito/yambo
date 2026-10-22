import { useTranslation } from "react-i18next";
import { useCart } from "~/context/CartContext";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export default function FloatingCartButton() {
  const { t } = useTranslation();
  const { getTotalItems, toggleCart } = useCart();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const itemCount = getTotalItems();

  if (itemCount === 0) return null;

  const handleClick = () => {
    if (isMobile) {
      navigate("/mi-espacio/cesta");
    } else {
      toggleCart();
    }
  };

  return (
    <button type="button"
      onClick={handleClick}
      className="fixed bottom-20 md:bottom-6 right-6 z-30 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:from-yambo-green-600 hover:to-yambo-green-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg shadow-yambo-green-500/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-yambo-green-500/40 animate-bounce-gentle"
      aria-label={t('dashboard.openCart')}
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
