import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AreaSociosIndex, { meta } from "./index";

const useAuthMock = vi.fn();
const useDashboardDataMock = vi.fn();

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => useAuthMock(),
}));

vi.mock("~/hooks/useDashboardData", () => ({
    useDashboardData: () => useDashboardDataMock(),
}));

vi.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => null,
}));

vi.mock("~/components/common/LoadingSpinner", () => ({
    LoadingSpinner: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("~/components/common/ErrorMessage", () => ({
    ErrorMessage: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
        <div>
            <p>{message}</p>
            <button onClick={onRetry}>retry</button>
        </div>
    ),
}));

vi.mock("~/components/dashboard/home/SummaryCards", () => ({
    default: () => <div>summary-cards</div>,
}));

vi.mock("~/components/dashboard/home/RecentOrdersList", () => ({
    default: () => <div>recent-orders</div>,
}));

vi.mock("~/components/dashboard/home/AdminStatsSection", () => ({
    default: () => <div>admin-stats</div>,
}));

describe("Dashboard Home Route", () => {
    it("returns expected meta", () => {
        expect(meta({} as any)).toEqual([
            { title: "Yambo - Inicio" },
            {
                name: "description",
                content: "Asociación juvenil de Alcobendas: vive, aprende y crece con Yambo.",
            },
        ]);
    });

    it("shows loading state", () => {
        useAuthMock.mockReturnValue({ user: { name: "Ana" } });
        useDashboardDataMock.mockReturnValue({
            personal: null,
            admin: null,
            reportSnapshot: null,
            loading: true,
            error: null,
            refetch: vi.fn(),
        });

        render(<AreaSociosIndex />);

        expect(screen.getByText("Cargando dashboard...")).toBeInTheDocument();
    });

    it("shows error state and retries", () => {
        const refetch = vi.fn();
        useAuthMock.mockReturnValue({ user: { name: "Ana" } });
        useDashboardDataMock.mockReturnValue({
            personal: null,
            admin: null,
            reportSnapshot: null,
            loading: false,
            error: "fallo",
            refetch,
        });

        render(<AreaSociosIndex />);

        fireEvent.click(screen.getByText("retry"));
        expect(refetch).toHaveBeenCalled();
    });

    it("renders personal and admin sections when data is ready", () => {
        useAuthMock.mockReturnValue({ user: { name: "Ana" } });
        useDashboardDataMock.mockReturnValue({
            personal: { totalOrders: 4, totalIssues: 2, recentOrders: [] },
            admin: { totalUsers: 10 },
            reportSnapshot: { totalOrders: 1 },
            loading: false,
            error: null,
            refetch: vi.fn(),
        });

        render(<AreaSociosIndex />);

        expect(screen.getByText("¡Hola, Ana!")).toBeInTheDocument();
        expect(screen.getByText("summary-cards")).toBeInTheDocument();
        expect(screen.getByText("recent-orders")).toBeInTheDocument();
        expect(screen.getByText("admin-stats")).toBeInTheDocument();
    });
});