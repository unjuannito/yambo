import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminStatsSection from "./AdminStatsSection";

const hasPermissionMock = vi.fn();
const summaryCardsMock = vi.fn((_props: unknown) => <div data-testid="summary-cards" />);

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({
        hasPermission: (...args: any[]) => hasPermissionMock(...args),
    }),
}));

vi.mock("~/components/dashboard/home/SummaryCards", () => ({
    default: (props: any) => {
        summaryCardsMock(props);
        return <div data-testid="summary-cards" />;
    },
}));

vi.mock("~/components/dashboard/home/RecentActivitiesList", () => ({
    default: ({ activities }: { activities: any[] }) => (
        <div data-testid="recent-activities">{activities.length}</div>
    ),
}));

describe("AdminStatsSection", () => {
    it("returns null when user has no admin permissions", () => {
        hasPermissionMock.mockReturnValue(false);

        const { container } = render(
            <AdminStatsSection
                data={{
                    totalUsers: 0,
                    totalOrders: 0,
                    totalProjects: 0,
                    totalProducts: 0,
                    recentActivities: [],
                } as any}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("renders summary and activities with computed counts", () => {
        hasPermissionMock.mockImplementation((permission) => permission.obj === "user");

        render(
            <AdminStatsSection
                data={{
                    totalUsers: 12,
                    totalOrders: 8,
                    totalProjects: 4,
                    totalProducts: 2,
                    recentActivities: [{ id: "a1" }, { id: "a2" }],
                } as any}
            />,
        );

        expect(screen.getByText("Administración")).toBeInTheDocument();
        expect(screen.getByTestId("summary-cards")).toBeInTheDocument();
        expect(screen.getByTestId("recent-activities")).toHaveTextContent("2");
        expect(summaryCardsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                counts: expect.objectContaining({
                    totalUsers: 12,
                    totalOrders: 8,
                    totalProjects: 4,
                    totalProducts: 2,
                    activities: 2,
                }),
            }),
        );
    });
});
