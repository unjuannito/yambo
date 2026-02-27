import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import SociosNav from "~/components/dashboard/Nav";
import SociosHeader from "~/components/dashboard/Header";
import { useAuth } from "~/hooks/useAuth";
import LINKS_MAP from "~/data/links";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";

export const ssr = false;

// This is the layout for area-socios section
export default function AreaSociosLayout() {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const links = LINKS_MAP.filter(link => link.need == null || user && user.permissions && (user.permissions.filter(perm => perm.obj == link.need!.obj && perm.actions.includes(link.need!.action))).length > 0);

  useEffect(() => {
    if (!loading && !isAuthenticated()) navigate("/login");
  }, [loading, navigate]);

  if (loading || !user) {
    return (
      <>
        {/* Skeleton header */}
        <header className="w-full bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex flex-row">
          {/* Skeleton sidebar — hidden on mobile, matching real sidebar dimensions */}
          <nav className="hidden md:flex sticky left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gray-50 flex-col p-4 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </nav>
          {/* Loading spinner in content area */}
          <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)] h-[calc(100vh-4rem)] justify-center items-center">
            <LoadingSpinner size="lg" message="Cargando usuario..." />
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SociosHeader links={links} />
      <div className="flex flex-row">
        <SociosNav links={links} />
        <Outlet />
      </div>
    </>
  );
}

