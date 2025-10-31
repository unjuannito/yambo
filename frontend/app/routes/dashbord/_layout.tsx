import { useEffect, useState } from "react";
import {Outlet, useNavigate } from "react-router";
import SociosNav from "~/components/dashbord/Nav";
import SociosHeader from "~/components/dashbord/Header";
import { useAuth } from "~/hooks/useAuth";
import { LINKS_MAP } from "~/utils/constants"

// This is the layout for area-socios section
export default function AreaSociosLayout() {
  const { user, isAuthenticated } = useAuth();
  const [summaries, setSumaries] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if(!isAuthenticated()) 
      navigate("/login");

    // Previous data
    const ret = {
      status: 'OK',
      user: {
        id: "0001",
        name: "Laura",
        username: "laroba",
        icon: {
          href: '/monitores/laura.jpg ',
          center: { x: 60, y: 30 },
          scale: 110,
        },
        role: "admin",
        email: "laroba@gmail.com",
      },
      JWT: 'JWT1',
      summaries: [
        {
          id: 1,
          title: "Borradores",
          icon: '/icons/pen.svg',
          href: '/mi-espacio/actividades',
          count: 4,
        },
        {
          id: 2,
          title: "Pendientes",
          icon: '/icons/clock.svg',
          href: '/mi-espacio/actividades',
          count: 1,
        },
        {
          id: 3,
          title: "Facturas",
          icon: '/icons/file-lines.svg',
          href: '/mi-espacio/facturas',
          count: 12,
        },
        {
          id: 4,
          title: "Notificaciones",
          icon: '/icons/bell.svg',
          href: '/mi-espacio/notificaciones',
          count: 3,
        },
      ]

    };
  }, [navigate]);

  if (!user) {
    return <div className="flex-1 flex items-center justify-center">Cargando usuario...</div>;
  }


  return (
    <>
      <SociosHeader links={LINKS_MAP} user={user} />
      <SociosNav links={LINKS_MAP} />
      <main className="flex-1 mt-16 md:mx-64 pt-8 px-4 md:px-8 w-full md:w-[calc(100vw-16rem)]">
        <Outlet context={{ summaries: summaries, user: user }} />
      </main>
    </>
  );
}

