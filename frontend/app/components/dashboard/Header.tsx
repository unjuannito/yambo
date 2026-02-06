import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/hooks/useAuth";
import { BurgerButton } from "~/components/common/BurgerButton";
import { NAV_SECTIONS, NAV_ICONS } from "~/data/navConfig";
import type { Link } from "~/data/links";

interface HeaderProps {
    links: Link[];
}

export default function Header({ links }: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    // Create a map of available links by name for quick lookup
    const linkMap = new Map(links.map(link => [link.name, link]));

    return (
        <header className="w-full bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-8xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
                <a href="/mi-espacio" className="flex items-center space-x-2">
                    <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
                    <span className="text-2xl font-bold text-gray-800">Yambo</span>
                </a>
                <div className="flex gap-4 items-center">
                    <a
                        href="/"
                        className="hidden md:block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap transition-colors"
                    >
                        Pagina publica
                    </a>
                    <BurgerButton
                        isOpen={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="md:hidden"
                    />
                </div>
            </div>

            {/* Mobile menu overlay */}
            {menuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Mobile menu drawer */}
            <div
                className={`
                    fixed top-0 left-0 w-64 h-full bg-white z-50 p-6 overflow-y-auto
                    transform transition-transform duration-300 ease-in-out
                    ${menuOpen ? "translate-x-0" : "-translate-x-full"}
                `}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="space-y-4">
                    {/* Logo */}
                    <a href="/mi-espacio" className="flex items-center space-x-2 mb-6">
                        <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
                        <span className="text-2xl font-bold text-gray-800">Yambo</span>
                    </a>

                    {/* Navigation sections */}
                    {NAV_SECTIONS.map((section) => {
                        // Filter items to only show links the user has access to
                        const visibleLinks = section.items
                            .map(itemName => linkMap.get(itemName))
                            .filter((link): link is Link => link !== undefined);

                        if (visibleLinks.length === 0) return null;

                        return (
                            <div key={section.title} className="pt-2">
                                <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {section.title}
                                </h3>
                                <nav className="space-y-1">
                                    {visibleLinks.map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.href}
                                            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            {NAV_ICONS[link.name]}
                                            <span>{link.label}</span>
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        );
                    })}

                    {/* Logout button */}
                    <div className="pt-4 border-t border-gray-200">
                        <button
                            onClick={() => {
                                handleLogout();
                                setMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                        >
                            {NAV_ICONS.logout}
                            <span>Cerrar sesión</span>
                        </button>
                    </div>

                    {/* Public page link */}
                    <a
                        href="/"
                        className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700 transition-colors"
                        onClick={() => setMenuOpen(false)}
                    >
                        Pagina publica
                    </a>
                </div>
            </div>
        </header>
    );
}
