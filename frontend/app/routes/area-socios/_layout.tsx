import { useEffect, useState } from "react";
import {Outlet, useNavigate } from "react-router";
import SociosNav from "~/components/area-socios/SociosNav";
import SociosHeader from "~/components/area-socios/SociosHeader";
import { useAuth } from "~/hooks/useAuth";

// This is the layout for area-socios section
export default function AreaSociosLayout() {
  const { user, isAuthenticated } = useAuth();
  const [summaries, setSumaries] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if(!isAuthenticated()) 
      navigate("/area-socios/login");

    // Previous data
    const ret = {
      status: 'OK',
      user: {
        id: "0001",
        name: "Laura",
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
          href: '/area-socios/actividades',
          count: 4,
        },
        {
          id: 2,
          title: "Pendientes",
          icon: '/icons/clock.svg',
          href: '/area-socios/actividades',
          count: 1,
        },
        {
          id: 3,
          title: "Facturas",
          icon: '/icons/file-lines.svg',
          href: '/area-socios/facturas',
          count: 12,
        },
        {
          id: 4,
          title: "Notificaciones",
          icon: '/icons/bell.svg',
          href: '/area-socios/notificaciones',
          count: 3,
        },
      ]

    };
  }, [navigate]);

  if (!user) {
    return <div className="flex-1 flex items-center justify-center">Cargando usuario...</div>;
  }


  const links = [
    { href: '/area-socios', label: 'Página Principal' },
    { href: '/area-socios/actividades', label: 'Mis Actividades' },
    { href: '/area-socios/facturas', label: 'Mis Facturas' },
    { href: '/area-socios/notificaciones', label: 'Mis Notificaciones' },
    { href: '/area-socios/usuario', label: 'Mi Perfil' },
    { href: '/area-socios/monitores', label: 'Monitores' },
    // { href: '/area-socios/ajustes', label: 'Ajustes' },
  ];

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

