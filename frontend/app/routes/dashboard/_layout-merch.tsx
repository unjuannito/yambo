import { Outlet, useMatches } from "react-router";
import { CartProvider } from "~/context/CartContext";
import CartSidebar from "~/components/dashboard/CartSidebar";
import FloatingCartButton from "~/components/dashboard/FloatingCartButton";

export default function MerchLayout() {
  const matches = useMatches();
  const showSidebar = matches.every(
    (m) => (m.handle as { sidebar?: boolean })?.sidebar !== false
  );

  return (
    <CartProvider>
      <Outlet />
      {showSidebar && <CartSidebar />}
      {showSidebar && <FloatingCartButton />}
    </CartProvider>
  );
}