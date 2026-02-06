import { Outlet } from "react-router";
import { CartProvider } from "~/context/CartContext";
import CartSidebar from "~/components/dashboard/CartSidebar";
import FloatingCartButton from "~/components/dashboard/FloatingCartButton";

// Layout específico para las páginas del merch
export default function MerchLayout() {
  return (
    <CartProvider>
      <Outlet />
      <CartSidebar />
      <FloatingCartButton />
    </CartProvider>
  );
}
