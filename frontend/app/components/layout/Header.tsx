import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BurgerButton } from "~/components/common/BurgerButton";
import { fireConfettiAt } from "~/utils/confetti";

export default function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoSpinning, setLogoSpinning] = useState(false);
  const [showLogoMessage, setShowLogoMessage] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const links = [
    { label: t('nav.home'), href: "/" },
    { label: t('nav.projects'), href: "/proyectos" },
    { label: t('nav.activities'), href: "/actividades" },
    { label: t('nav.staff'), href: "/equipo" },
    { label: t('nav.contact'), href: "/contacto" },
  ];

  function handleLogoClick(e: React.MouseEvent) {
    e.preventDefault();
    clickCountRef.current++;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);

    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0;
      setLogoSpinning(true);
      setShowLogoMessage(true);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      fireConfettiAt(x, y);

      setTimeout(() => setLogoSpinning(false), 700);
      setTimeout(() => setShowLogoMessage(false), 3000);
    }
  }

  return (
    <header className="w-full glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-8xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <a
          href="/"
          className="relative flex items-center space-x-1.5 sm:space-x-2 group shrink-0"
          onClick={handleLogoClick}
        >
          <img
            src="/logo.png"
            alt="Yambo logo"
            className={`h-8 sm:h-9 w-auto transition-transform duration-300 group-hover:scale-110 ${logoSpinning ? "ee-spin" : ""}`}
          />
          {showLogoMessage && (
            <span className="ee-message ee-slide-down text-sm bg-gradient-to-r from-yambo-green-500 to-yambo-purple-500 text-white px-4 py-1.5 rounded-full shadow-lg mt-2 font-semibold">
              ¡Yambo te quiere!
            </span>
          )}
        </a>

        <nav className="hidden custom-break md:flex space-x-1 items-center">
          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-gray-600 hover:text-yambo-black font-medium rounded-full transition-all duration-200 underline-grow"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/mi-espacio"
            className="ml-3 px-5 py-2 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-yambo-green-200 transition-all duration-200 whitespace-nowrap hover-pop"
          >
            {t('auth.login')}
          </a>
        </nav>

        <BurgerButton
          isOpen={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden custom-break-button hidden"
        />
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-yambo-black/40 backdrop-blur-sm z-40"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`
          fixed top-0 left-0 w-72 h-full bg-white z-50 p-6
          transform transition-transform duration-300 ease-in-out rounded-r-3xl shadow-2xl
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="space-y-2">
          <a href="/" className="flex items-center space-x-2 mb-6">
            <img src="/logo.png" alt="Yambo logo" className="h-9 w-auto" />
          </a>

          {links.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="block text-gray-600 hover:text-yambo-black px-4 py-2.5 rounded-xl font-medium transition-all duration-200"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4">
            <a
              href="/mi-espacio"
              className="block w-full px-4 py-2.5 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full text-center font-semibold shadow-md"
              onClick={() => setMenuOpen(false)}
            >
              {t('auth.login')}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
