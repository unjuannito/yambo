import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
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
          `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-200 ${
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
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isInMerchSection =
    location.pathname.includes("/articulos") ||
    location.pathname.includes("/cesta");

  let cartRef: { getTotalItems: () => number; toggleCart: () => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cartRef = useCart();
  } catch {
    // CartContext not available outside merch section
  }

  const getCartItems = useCallback(() => cartRef?.getTotalItems() ?? 0, [cartRef]);
  const handleToggleCart = useCallback(() => cartRef?.toggleCart(), [cartRef]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkMap = new Map(links.map((link) => [link.name, link]));

  return (
    <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-56 bg-gradient-to-b from-yambo-green-50/30 to-white/80 flex-col overflow-y-auto border-r border-yambo-green-100/50">
      <div className="flex-1 p-3 space-y-4">
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
                  return <NavItem key={link.name} link={link} />;
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom section with logout */}
      <div className="border-t border-yambo-green-100/50 p-3">
        <button type="button"
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          {NAV_ICONS.logout}
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </nav>
  );
}
