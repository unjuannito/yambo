import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AreaSociosLayout from "./_layout";

const useAuthMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("react-router", () => ({
    Outlet: () => <div data-testid="dashboard-outlet" />,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/mi-espacio", search: "" }),
}));

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => useAuthMock(),
}));

vi.mock("~/components/dashboard/Nav", () => ({
    default: () => <nav data-testid="dashboard-nav" />,
}));
vi.mock("~/components/dashboard/Header", () => ({
    default: () => <header data-testid="dashboard-header" />,
}));
vi.mock("~/components/dashboard/BottomTabBar", () => ({
    default: () => <div data-testid="bottom-tab" />,
}));
vi.mock("~/components/common/LoadingSpinner", () => ({
    LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));
vi.mock("~/utils/auth", () => ({
    getLoginUrl: (next: string) => `/login?next=${encodeURIComponent(next)}`,
}));

vi.mock("~/data/links", () => ({
    default: [
        { label: "Inicio", href: "/mi-espacio", need: null },
        { label: "Usuarios", href: "/mi-espacio/admin/usuarios", need: { obj: "user", action: "read" } },
    ],
}));

describe("Dashboard Layout", () => {
    it("shows loading skeleton while auth is loading", () => {
        useAuthMock.mockReturnValue({
            user: null,
            loading: true,
            isAuthenticated: () => false,
        });

        render(<AreaSociosLayout />);

        expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("renders full dashboard layout for authenticated user", () => {
        useAuthMock.mockReturnValue({
            user: {
                permissions: [{ obj: "user", actions: ["read"] }],
            },
            loading: false,
            isAuthenticated: () => true,
        });

        render(<AreaSociosLayout />);

        expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
        expect(screen.getByTestId("dashboard-nav")).toBeInTheDocument();
        expect(screen.getByTestId("dashboard-outlet")).toBeInTheDocument();
        expect(screen.getByTestId("bottom-tab")).toBeInTheDocument();
    });
});
