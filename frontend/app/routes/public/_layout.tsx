import { Outlet } from "react-router";
import Header from "~/components/layout/Header";
import { useTranslation } from "react-i18next";

export default function Layout() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      {/* Playful Footer */}
      <footer className="relative bg-yambo-black text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-10 mb-8">
            {/* Logo + tagline */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Yambo" className="h-8 w-auto" />
                <span className="text-xl font-bold font-display">Yambo</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t('public.footerTagline')}
              </p>
            </div>

            {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-3 text-yambo-green-400">{t('public.footerExplore')}</h4>
            <nav className="space-y-2">
              {[
                { label: t('public.footerProjects'), href: "/proyectos" },
                { label: t('public.footerActivities'), href: "/actividades" },
                { label: t('public.footerMonitors'), href: "/monitores" },
                { label: t('public.footerContact'), href: "/contacto" },
              ].map(link => (
                <a
                  key={link.href}
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
              <h4 className="font-semibold mb-3 text-yambo-purple-400">{t('public.footerAccess')}</h4>
              <a
                href="/mi-espacio"
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yambo-green-500 to-yambo-purple-500 text-white rounded-full font-semibold text-sm hover:shadow-lg transition-all hover-pop"
              >
                {t('public.footerAccessButton')}
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
                <a href="/legal/aviso-legal" className="text-gray-500 hover:text-white transition-colors text-xs">{t('public.footerLegal')}</a>
                <a href="/legal/privacidad" className="text-gray-500 hover:text-white transition-colors text-xs">{t('public.footerPrivacy')}</a>
                <a href="/legal/cookies" className="text-gray-500 hover:text-white transition-colors text-xs">{t('public.footerCookies')}</a>
                <a href="/legal/terminos" className="text-gray-500 hover:text-white transition-colors text-xs">{t('public.footerTerms')}</a>
                <a href="/legal/proteccion-datos" className="text-gray-500 hover:text-white transition-colors text-xs">{t('public.footerDataProtection')}</a>
            </div>
            <p className="text-gray-500 text-xs text-center">
              {t('public.footerCredit', { year })}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
