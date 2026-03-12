import { Outlet } from "react-router";
import Header from "~/components/home/Header";

export default function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      {/* Playful Footer */}
      <footer className="relative bg-yambo-black text-white overflow-hidden">
        {/* Wavy SVG top */}
        <svg
          className="absolute -top-12 left-0 w-full h-12"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,48L60,42.7C120,37.3,240,26.7,360,26.7C480,26.7,600,37.3,720,40C840,42.7,960,37.3,1080,32C1200,26.7,1320,21.3,1380,18.7L1440,16L1440,48L0,48Z"
            fill="#2a2a2a"
          />
        </svg>

        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Yambo" className="h-8 w-auto" />
                <span className="text-xl font-bold font-display">Yambo</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Asociación juvenil en Alcobendas. Vive, aprende y crece con nosotros. 🌱
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-semibold mb-3 text-yambo-green-400">Explora</h4>
              <nav className="space-y-2">
                {[
                  { label: "Proyectos", href: "/proyectos" },
                  { label: "Actividades", href: "/actividades" },
                  { label: "Monitores", href: "/monitores" },
                  { label: "Contacto", href: "/contacto" },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Access */}
            <div>
              <h4 className="font-semibold mb-3 text-yambo-purple-400">Zona socios o padres</h4>
              <a
                href="/mi-espacio"
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yambo-green-500 to-yambo-purple-500 text-white rounded-full font-semibold text-sm hover:shadow-lg transition-all hover-pop"
              >
                Acceder al área privada →
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Yambo · Hecho con 💚 en Alcobendas
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
