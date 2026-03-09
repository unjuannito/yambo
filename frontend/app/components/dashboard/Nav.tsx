import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { useCart } from "~/context/CartContext";
import { NAV_SECTIONS, NAV_ICONS } from "~/data/navConfig";
import LINKS_MAP, { type Link } from "~/data/links";

const NavItem = React.memo(function NavItem({ link }: { link: Link }) {
    return (
        <li>
            <NavLink
                to={link.href}
                end
                className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                            ? "bg-white text-gray-900 font-medium shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
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

    // Check if we're in a merch page (where CartContext is available)
    const isInMerchSection =
        location.pathname.includes("/merch") ||
        location.pathname.includes("/cesta");

    // Only use cart hooks if we're in merch section
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

    // Create a map of available links by name for quick lookup
    const linkMap = new Map(links.map(link => [link.name, link]));

    return (
        <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-50 flex-col overflow-y-auto">
            <div className="flex-1 p-4 space-y-6">
                {NAV_SECTIONS.map((section) => {
                    // Filter items to only show links the user has access to
                    const visibleLinks = section.items
                        .map(itemName => linkMap.get(itemName))
                        .filter((link): link is Link => link !== undefined);

                    if (visibleLinks.length === 0) return null;

                    return (
                        <div key={section.title}>
                            <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {section.title}
                            </h3>
                            <ul className="space-y-1">
                                {visibleLinks.map((link) => {
                                    // Special handling for cart button in merch section
                                    if (link.name === "cart" && isInMerchSection) {
                                        return (
                                            <li key={link.name}>
                                                <button
                                                    onClick={toggleCart}
                                                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    {NAV_ICONS[link.name]}
                                                    <span>{link.label}</span>
                                                    {getTotalItems() > 0 && (
                                                        <span className="ml-auto bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
            <div className="border-t border-gray-200 p-4">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    {NAV_ICONS.logout}
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </nav>
    );
}
