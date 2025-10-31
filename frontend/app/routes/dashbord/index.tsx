import { use, useEffect, useState } from "react";
import type { Route } from "./+types/index";
import { useOutletContext } from "react-router";
import SummaryCards from "~/components/dashbord/home/SummaryCards";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Yambo - Inicio" },
    { name: "description", content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo." },
  ];
}

export default function AreaSociosIndex() {
  const {summaries, user } = useOutletContext<any>();

  return (
    <>
      <h1 className="p-4 text-2xl font-semibold">
        !Hola, {user.name}!
      </h1>
      <SummaryCards summaries={summaries} />
    </>
  );
}