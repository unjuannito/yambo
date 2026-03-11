import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useCart } from "~/context/CartContext";
import { NAV_SECTIONS, NAV_ICONS } from "~/data/navConfig";
import type { Link } from "~/data/links";

const NavItem = React.memo(function NavItem({ link }: { link: Link }) {
  return (
    <li>
      <NavLink
        to={link.href}
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
            isActive
              ? "bg-yambo-green-50 text-yambo-green-700 font-semibold border-l-3 border-yambo-green-500 shadow-sm"
              : "text-gray-600 hover:bg-yambo-green-50/50 hover:text-yambo-green-700"
          }`
        }
      >
        {NAV_ICONS[link.name]}
        <span>{link.label}</span>
      </NavLink>
    </li>
  );
});

interface SociosNavProps {
  links: Link[];
}

export default function SociosNav({ links }: SociosNavProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isInMerchSection =
    location.pathname.includes("/merch") ||
    location.pathname.includes("/cesta");

  let getTotalItems = () => 0;
  let toggleCart = () => {};

  if (isInMerchSection) {
    try {
      const cart = useCart();
      getTotalItems = cart.getTotalItems;
      toggleCart = cart.toggleCart;
    } catch (e) {
      // CartContext not available, use defaults
    }
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkMap = new Map(links.map((link) => [link.name, link]));

  return (
    <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-yambo-green-50/30 to-white/80 flex-col overflow-y-auto border-r border-yambo-green-100/50">
      <div className="flex-1 p-4 space-y-6">
        {NAV_SECTIONS.map((section) => {
          const visibleLinks = section.items
            .map((itemName) => linkMap.get(itemName))
            .filter((link): link is Link => link !== undefined);

          if (visibleLinks.length === 0) return null;

          return (
            <div key={section.title}>
              <h3 className="px-3 mb-2 text-xs font-bold text-yambo-green-600 uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {visibleLinks.map((link) => {
                  if (link.name === "cart" && isInMerchSection) {
                    return (
                      <li key={link.name}>
                        <button
                          onClick={toggleCart}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-yambo-green-50/50 hover:text-yambo-green-700 transition-all duration-200"
                        >
                          {NAV_ICONS[link.name]}
                          <span>{link.label}</span>
                          {getTotalItems() > 0 && (
                            <span className="ml-auto bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                              {getTotalItems()}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  }

                  return <NavItem key={link.name} link={link} />;
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom section with logout */}
      <div className="border-t border-yambo-green-100/50 p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          {NAV_ICONS.logout}
          <span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
