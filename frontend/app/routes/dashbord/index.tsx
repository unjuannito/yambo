import { use, useEffect, useState } from "react";
import type { Route } from "./+types/index";
import SummaryCards from "~/components/dashbord/home/SummaryCards";
import { useAuth } from "~/hooks/useAuth";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Inicio" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
  ];
}

export default function AreaSociosIndex() {
  const { user } = useAuth();

  return (
    <>
      <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
        <h1 className="p-4 text-2xl font-semibold">
          !Hola, {user?.name}!
        </h1>
        {/*TODO: Hacer <SummaryCards /> */}
      </main>

    </>
  );
}