import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";
import SummaryCards from "./SummaryCards";
import { PERSONAL_CARDS } from "~/data/summaries";

const hasPermissionMock = vi.fn();

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => ({
        hasPermission: (...args: any[]) => hasPermissionMock(...args),
    }),
}));

describe("SummaryCards", () => {
    it("renders title, cards and fallback count value", () => {
        hasPermissionMock.mockReturnValue(true);

        render(
            <MemoryRouter>
                <SummaryCards
                    title="Resumen"
                    cards={PERSONAL_CARDS}
                    counts={{ myOrders: 3, issues: 2 }}
                    columns={3}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText("Resumen")).toBeInTheDocument();
        expect(screen.getByText("Mis Pedidos")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("returns null when no cards are visible by permission", () => {
        hasPermissionMock.mockReturnValue(false);

        const restrictedCards = [
            {
                ...PERSONAL_CARDS[0],
                permission: { obj: "user", action: "read" as const },
            },
        ];

        const { container } = render(
            <MemoryRouter>
                <SummaryCards cards={restrictedCards} counts={{}} />
            </MemoryRouter>,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
