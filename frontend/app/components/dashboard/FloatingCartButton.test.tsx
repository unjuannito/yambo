import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import FloatingCartButton from "./FloatingCartButton";

const mockNavigate = vi.fn();
let mockGetTotalItems = vi.fn();
let mockToggleCart = vi.fn();

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                "dashboard.openCart": "Abrir cesta",
            };
            return map[key] || key;
        },
        i18n: { language: "es" },
        ready: true,
    }),
}));

vi.mock("react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("~/context/CartContext", () => ({
    useCart: () => ({
        getTotalItems: mockGetTotalItems,
        toggleCart: mockToggleCart,
    }),
}));

describe("FloatingCartButton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetTotalItems.mockReturnValue(0);
        // Default to desktop width
        Object.defineProperty(window, "innerWidth", {
            writable: true,
            configurable: true,
            value: 1024,
        });
        window.dispatchEvent(new Event("resize"));
    });

    it("does not render when cart is empty", () => {
        const { container } = render(<FloatingCartButton />);
        expect(container.firstChild).toBeNull();
    });

    it("renders with item count when cart has items", () => {
        mockGetTotalItems.mockReturnValue(3);
        render(<FloatingCartButton />);

        expect(screen.getByRole("button")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByLabelText("Abrir cesta")).toBeInTheDocument();
    });

    it("shows 9+ badge when items > 9", () => {
        mockGetTotalItems.mockReturnValue(15);
        render(<FloatingCartButton />);

        expect(screen.getByText("9+")).toBeInTheDocument();
    });

    describe("on desktop (>= 768px)", () => {
        beforeEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 1024,
            });
            window.dispatchEvent(new Event("resize"));
            mockGetTotalItems.mockReturnValue(2);
        });

        it("calls toggleCart when clicked", () => {
            render(<FloatingCartButton />);

            fireEvent.click(screen.getByRole("button"));

            expect(mockToggleCart).toHaveBeenCalledTimes(1);
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe("on mobile (< 768px)", () => {
        beforeEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
            window.dispatchEvent(new Event("resize"));
            mockGetTotalItems.mockReturnValue(2);
        });

        it("navigates to cart page when clicked", () => {
            render(<FloatingCartButton />);

            fireEvent.click(screen.getByRole("button"));

            expect(mockNavigate).toHaveBeenCalledWith("/mi-espacio/cesta");
            expect(mockToggleCart).not.toHaveBeenCalled();
        });
    });
});
