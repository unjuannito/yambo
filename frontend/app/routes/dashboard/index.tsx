import type { Route } from "./+types/index";
import { useAuth } from "~/hooks/useAuth";
import { useDashboardData } from "~/hooks/useDashboardData";
import { PERSONAL_CARDS } from "~/data/summaries";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import SummaryCards from "~/components/dashboard/home/SummaryCards";
import QuickActions from "~/components/dashboard/home/QuickActions";
import RecentOrdersList from "~/components/dashboard/home/RecentOrdersList";
import AdminStatsSection from "~/components/dashboard/home/AdminStatsSection";

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
        <main className="flex flex-col p-6 md:p-8 w-full md:w-[calc(100vw-16rem)]">
            {/* Playful greeting header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-2">
                    ¡Hola, {user?.name}! 👋
                </h1>
                <p className="text-gray-400">
                    Bienvenido a tu espacio en Yambo. Aquí tienes un resumen de tu actividad.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner size="lg" message="Cargando dashboard..." />
                </div>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : (
                <div className="space-y-8">
                    <QuickActions />

                    <SummaryCards
                        cards={PERSONAL_CARDS}
                        counts={personalCounts}
                        title="Mi resumen"
                    />

                    <RecentOrdersList orders={personal?.recentOrders ?? []} />

                    {admin && <AdminStatsSection data={admin} reportSnapshot={reportSnapshot} />}
                </div>
            )}
        </main>
    );
}
