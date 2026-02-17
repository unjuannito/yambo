import type { Route } from "./+types/index";
import SummaryCards from "~/components/dashboard/home/SummaryCards";
import { useAuth } from "~/hooks/useAuth";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Inicio" },
        {
            name: "description",
            content:
                "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo.",
        },
    ];
}

export default function AreaSociosIndex() {
    const { user } = useAuth();

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <h1 className="text-3xl font-bold mb-6">
                !Hola, {user?.name}!
            </h1>
            {/*TODO: Hacer <SummaryCards /> */}
        </main>
    );
}
