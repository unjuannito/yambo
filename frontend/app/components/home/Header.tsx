import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: "Inicio", href: "/" },
    { label: "Proyectos", href: "/proyectos" },
    { label: "Actividades", href: "/actividades" },
    { label: "Monitores", href: "/monitores" },
    { label: "Contacto", href: "/contacto" },
  ];

  return (
    <header className="w-full bg-white shadow-md fixed top-0 z-50">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <a href="#" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Yambo logo" className="h-8 w-auto" />
          <span className="text-2xl font-bold text-gray-800">Yambo</span>
        </a>


        <nav className="hidden custom-break md:flex space-x-6 items-center">
          {links.map(link => (
            <a key={link.label} href={link.href} className="text-gray-700 hover:text-gray-900">
              {link.label}
            </a>
          ))}
          <a
            href="/area-socios"
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            Área Socios
          </a>
        </nav>

        <button
          className="md:hidden custom-break-button hidden focus:outline-none"
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
              key={link.label}
              href={link.href}
              className="block text-gray-700 hover:text-gray-900 px-4"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/area-socios"
            className="mt-4 block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-center"
            onClick={() => setMenuOpen(false)}
          >
            Área Socios
          </a>
        </nav>
      </div>
    </header>
  );
}
