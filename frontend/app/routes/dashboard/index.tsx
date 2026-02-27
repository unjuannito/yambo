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
    const { personal, admin, loading, error, refetch } = useDashboardData();

    const personalCounts: Record<string, number> = {
        myOrders: personal.totalOrders,
        issues: 0,
        merch: 0,
    };

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <h1 className="text-3xl font-bold mb-2">
                ¡Hola, {user?.name}!
            </h1>
            <p className="text-gray-500 mb-8">
                Bienvenido a tu espacio en Yambo. Aquí tienes un resumen de tu actividad.
            </p>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner size="lg" message="Cargando dashboard..." />
                </div>
            ) : error ? (
                <ErrorMessage message={error} onRetry={refetch} />
            ) : (
                <div className="space-y-8">
                    {/* Quick action buttons */}
                    <QuickActions />

                    {/* Personal summary cards */}
                    <SummaryCards
                        cards={PERSONAL_CARDS}
                        counts={personalCounts}
                        title="Mi resumen"
                    />

                    {/* Recent orders */}
                    <RecentOrdersList orders={personal.recentOrders} />

                    {/* Admin section — only visible with admin permissions */}
                    {admin && <AdminStatsSection data={admin} />}
                </div>
            )}
        </main>
    );
}
