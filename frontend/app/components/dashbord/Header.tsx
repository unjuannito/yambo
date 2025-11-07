import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import type { User } from "~/types/userType";

interface HeaderProps {
  links: { label: string; href: string, name: string }[];
}

export default function Header({ links }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="w-full bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="/mi-espacio" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
          <span className="text-2xl font-bold text-gray-800">Yambo</span>
        </a>
        <nav className="flex gap-6 items-center">
          <a
            href="/"
            className="hidden md:block ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            Pagina publica
          </a>
          <button
            className="md:hidden display-block focus:outline-none"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>

        </nav>

      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 w-64 h-full bg-white z-50 p-6
          transform transition-transform duration-300 ease-in-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="space-y-4">
          <a href="#" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
            <span className="text-2xl font-bold text-gray-800">Yambo</span>
          </a>
          {links.map(link => (
            <a
              key={link.name}
              href={link.href}
              className="block text-gray-700 hover:text-gray-900 px-4"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <a
            href="/"
            className="mt-4 block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center"
            onClick={() => setMenuOpen(false)}
          >
            Pagina publica
          </a>
        </nav>
      </div>
    </header>
  );
}
