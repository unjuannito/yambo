import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import SociosNav from "~/components/dashboard/Nav";
import SociosHeader from "~/components/dashboard/Header";
import BottomTabBar from "~/components/dashboard/BottomTabBar";
import { useAuth } from "~/hooks/useAuth";
import LINKS_MAP from "~/data/links";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getLoginUrl } from "~/utils/auth";

import { useTranslation } from "react-i18next";

export const ssr = false;

export default function AreaSociosLayout() {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const links = LINKS_MAP.filter(
    (link) =>
      link.need == null ||
      (user &&
        user.permissions &&
        user.permissions.filter(
          (perm) =>
            perm.obj === link.need!.obj &&
            perm.actions.includes(link.need!.action)
        ).length > 0)
  );

  useEffect(() => {
    if (!loading && !isAuthenticated())
      navigate(getLoginUrl(location.pathname + location.search));
  }, [loading, navigate]);

  if (loading || !user) {
    return (
      <>
        {/* Skeleton header — glassmorphism style */}
        <header className="w-full glass sticky top-0 z-50 border-b border-white/20">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-yambo-green-100 rounded-2xl animate-pulse" />
              <div className="h-6 w-20 bg-yambo-green-100 rounded-full animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex flex-row">
          {/* Skeleton sidebar */}
          <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-56 bg-gradient-to-b from-yambo-green-50/40 to-white flex-col p-3 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-yambo-green-100 rounded-full animate-pulse" />
                <div className="h-8 w-full bg-yambo-green-50 rounded-xl animate-pulse" />
                <div className="h-8 w-full bg-yambo-green-50 rounded-xl animate-pulse" />
              </div>
            ))}
          </nav>
          <main className="flex flex-col p-4 md:p-6 w-full md:w-[calc(100vw-14rem)] h-[calc(100vh-4rem)] justify-center items-center">
            <LoadingSpinner size="lg" message={t('component.loadingSpinner') + "..."} />
          </main>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <SociosHeader links={links} />
      <div className="flex flex-row flex-1 min-h-0">
        <SociosNav links={links} />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomTabBar links={links} />
    </div>
  );
}
