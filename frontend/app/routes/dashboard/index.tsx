import type { Route } from "./+types/index";
import { useAuth } from "~/hooks/useAuth";
import { useDashboardData } from "~/hooks/useDashboardData";
import { PERSONAL_CARDS } from "~/data/summaries";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import SummaryCards from "~/components/dashboard/home/SummaryCards";
import RecentOrdersList from "~/components/dashboard/home/RecentOrdersList";
import AdminStatsSection from "~/components/dashboard/home/AdminStatsSection";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHand } from "@fortawesome/free-solid-svg-icons";

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
    const { personal, admin, reportSnapshot, loading, error, refetch } = useDashboardData();

    const personalCounts: Record<string, number> = {
        myOrders: personal?.totalOrders ?? 0,
        issues: personal?.totalIssues ?? 0,
        merch: 0,
    };

    return (
        <main className="flex flex-col p-3 md:p-5 w-full">
            {/* Greeting header */}
            <div className="mb-3">
                <h1 className="text-xl font-extrabold font-display text-yambo-black mb-0.5 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHand} className="w-4 h-4 text-amber-400" />
                    ¡Hola, {user?.name}!
                </h1>
                <p className="text-sm text-gray-400">
                    Bienvenido a tu espacio en Yambo.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner size="lg" message="Cargando dashboard..." />
                </div>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : (
                <div className="space-y-3">

                    <SummaryCards
                        cards={PERSONAL_CARDS}
                        counts={personalCounts}
                        title="Mi resumen"
                        columns={3}
                    />

                    <RecentOrdersList orders={personal?.recentOrders ?? []} />

                    {admin && <AdminStatsSection data={admin} reportSnapshot={reportSnapshot} />}
                </div>
            )}
        </main>
    );
}
