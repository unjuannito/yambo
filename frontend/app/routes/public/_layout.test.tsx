import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Layout from "./_layout";

vi.mock("react-router", () => ({
    Outlet: () => <div data-testid="outlet" />,
}));

vi.mock("~/components/layout/Header", () => ({
    default: () => <header data-testid="public-header" />,
}));

describe("Public Layout", () => {
    it("renders header, outlet and footer call to action", () => {
        render(<Layout />);

        expect(screen.getByTestId("public-header")).toBeInTheDocument();
        expect(screen.getByTestId("outlet")).toBeInTheDocument();
        expect(screen.getByText("Acceder al área privada →")).toBeInTheDocument();
    });
});
