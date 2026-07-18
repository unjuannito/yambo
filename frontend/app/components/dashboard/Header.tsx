import { useTranslation } from "react-i18next";
import type { Link } from "~/data/links";

interface HeaderProps {
  links: Link[];
}

export default function Header({ links: _links }: HeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="w-full glass sticky top-0 z-50 border-b border-white/20">
      <div className="+mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a
          href="/mi-espacio"
          className="flex items-center space-x-2 group"
        >
          <img
            src="/logo.png"
            alt="Yambo logo"
            className="h-8 w-auto transition-transform group-hover:scale-110"
          />
        </a>
        <div className="flex gap-3 items-center">
          <a
            href="/"
            className="hidden md:block px-5 py-2 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-yambo-green-500/25 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5"
          >
            {t('dashboard.publicPage')}
          </a>
        </div>
      </div>
    </header>
  );
}
