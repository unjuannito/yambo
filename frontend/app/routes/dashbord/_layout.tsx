import { useEffect, useState } from "react";
import { Links, Outlet, useNavigate } from "react-router";
import SociosNav from "~/components/dashbord/Nav";
import SociosHeader from "~/components/dashbord/Header";
import { useAuth } from "~/hooks/useAuth";
import LINKS_MAP from "~/data/links";

// This is the layout for area-socios section
export default function AreaSociosLayout() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const links = LINKS_MAP.filter(link => link.need == null || user && user.permissions && (user.permissions.filter(perm => perm.obj == link.need.obj && perm.actions.includes(link.need.action))).length > 0).map(({ need, ...rest }) => rest);

  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  if (!user) {
    return <div className="flex-1 flex items-center justify-center">Cargando usuario...</div>;
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

