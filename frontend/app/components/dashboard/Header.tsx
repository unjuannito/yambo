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

  const linkMap = new Map(links.map((link) => [link.name, link]));

  return (
    <header className="w-full glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a
          href="/mi-espacio"
          className="flex items-center space-x-2 group"
        >
          <img
            src="/logo.png"
            alt="Yambo logo"
            className="h-8 w-auto transition-transform group-hover:scale-110"
          />
          <span className="text-2xl font-extrabold font-display gradient-text">
            Yambo
          </span>
        </a>
        <div className="flex gap-4 items-center">
          <a
            href="/"
            className="hidden md:block px-5 py-2 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-yambo-green-500/25 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5"
          >
            Página pública
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu drawer */}
      <div
        className={`
          fixed top-0 left-0 w-72 h-full bg-white/95 backdrop-blur-xl z-50 p-6 overflow-y-auto
          rounded-r-3xl shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          {/* Logo */}
          <a
            href="/mi-espacio"
            className="flex items-center space-x-2 mb-6"
          >
            <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
            <span className="text-2xl font-extrabold font-display gradient-text">
              Yambo
            </span>
          </a>

          {/* Navigation sections */}
          {NAV_SECTIONS.map((section) => {
            const visibleLinks = section.items
              .map((itemName) => linkMap.get(itemName))
              .filter((link): link is Link => link !== undefined);

            if (visibleLinks.length === 0) return null;

            return (
              <div key={section.title} className="pt-2">
                <h3 className="px-4 mb-2 text-xs font-bold text-yambo-green-600 uppercase tracking-wider">
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {visibleLinks.map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      className="flex items-center gap-3 text-gray-700 hover:text-yambo-green-700 hover:bg-yambo-green-50 px-4 py-2.5 rounded-xl transition-all duration-200"
                      onClick={() => setMenuOpen(false)}
                    >
                      {NAV_ICONS[link.name]}
                      <span className="font-medium">{link.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            );
          })}

          {/* Logout button */}
          <div className="pt-4 border-t border-yambo-green-100">
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full text-gray-700 hover:text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all duration-200"
            >
              {NAV_ICONS.logout}
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>

          {/* Public page link */}
          <a
            href="/"
            className="block w-full px-4 py-2.5 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full text-center font-semibold hover:shadow-lg hover:shadow-yambo-green-500/25 transition-all duration-300"
            onClick={() => setMenuOpen(false)}
          >
            Página pública
          </a>
        </div>
      </div>
    </header>
  );
}
