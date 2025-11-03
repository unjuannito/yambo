import { useEffect, useState } from "react";
import { Links, Outlet, useNavigate } from "react-router";
import SociosNav from "~/components/dashbord/Nav";
import SociosHeader from "~/components/dashbord/Header";
import { useAuth } from "~/hooks/useAuth";
import { LINKS_MAP } from "~/utils/constants"

// This is the layout for area-socios section
export default function AreaSociosLayout() {
  const { user, isAuthenticated } = useAuth();
  const [summaries, setSumaries] = useState<any>(null);
  const navigate = useNavigate();

  const links = LINKS_MAP.filter( link => user?.permissions.includes(link.need))

  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  if (!user) {
    return <div className="flex-1 flex items-center justify-center">Cargando usuario...</div>;
  }


  return (
    <>
      <SociosHeader links={links} user={user} />
      <SociosNav links={links} />
      <main className="flex-1 mt-16 md:mx-64 pt-8 px-4 md:px-8 w-full md:w-[calc(100vw-16rem)]">
        <Outlet context={{ summaries: summaries, user: user }} />
      </main>
    </>
  );
}

