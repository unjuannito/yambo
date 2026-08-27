import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderEditorModal } from "./OrderEditorModal";
import { orderService } from "~/services/orderService";
import { productService, type Product } from "~/services/productService";
import { familyProductService } from "~/services/familyProductService";
import { adminUserService } from "~/services/adminUserService";
import toast from "react-hot-toast";
import type { Order } from "~/types/order";

vi.mock("~/services/orderService", () => ({
    orderService: {
        updateOrder: vi.fn(),
        createOrder: vi.fn(),
    },
}));

vi.mock("~/services/productService", () => ({
    productService: {
        getAllProducts: vi.fn(),
    },
}));

vi.mock("~/services/familyProductService", () => ({
    familyProductService: {
        listFamilyProducts: vi.fn(),
    },
}));

vi.mock("~/services/adminUserService", () => ({
    adminUserService: {
        listUsers: vi.fn(),
    },
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockProduct: Product = {
    id: "prod-1",
    name: "Camiseta Jamboloco",
    projectId: null,
    familyProductId: "drop-1",
    active: true,
    basePrice: 20,
    options: [
        {
            name: "Talla",
            type: "select",
            required: true,
            values: [
                { id: "10/11", label: "10/11" },
                { id: "12/13", label: "12/13", price: 2 },
            ],
        },
        { name: "Nombre", type: "text_input", required: true },
        { name: "Destinatario", type: "text_input" },
    ],
};

const mockOrder: Order = {
    id: "ORD001",
    user: { id: "U1", name: "Test User", email: "test@example.com" },
    status: "PENDING_PAYMENT",
    createdAt: "2024-01-01T00:00:00Z",
    hasOpenIssues: false,
    products: [
        {
            id: "op-1",
            productId: "prod-1",
            productName: "Camiseta Jamboloco",
            quantity: 1,
            price: 20,
            configuration: '{"Talla":"10/11","Nombre":"Paula","Destinatario":"Paula (es una prueba)"}',
            status: "PENDING",
        },
    ],
};

const renderModal = () =>
    render(<OrderEditorModal order={mockOrder} isOpen onClose={vi.fn()} onSaved={vi.fn()} />);

describe("OrderEditorModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(productService.getAllProducts).mockResolvedValue({
            content: [mockProduct],
            page: { totalElements: 1, totalPages: 1, number: 0, size: 500 },
        } as any);
        vi.mocked(familyProductService.listFamilyProducts).mockResolvedValue({
            content: [{ id: "drop-1", name: "Drop 1" }],
        } as any);
        vi.mocked(orderService.updateOrder).mockResolvedValue({} as any);
        vi.mocked(adminUserService.listUsers).mockResolvedValue({
            content: [],
            page: { totalElements: 0, totalPages: 0, number: 0, size: 1 },
        } as any);
    });

    it("renderiza los campos de opciones del producto en lugar del editor JSON", async () => {
        renderModal();

        // Espera a que carguen los productos y se rendericen las opciones
        await waitFor(() => expect(screen.getByDisplayValue("10/11")).toBeInTheDocument());

        // Select de Talla con el valor guardado
        expect(screen.getByDisplayValue("10/11")).toBeInTheDocument();
        // Inputs de texto con los valores guardados
        expect(screen.getByDisplayValue("Paula")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Paula (es una prueba)")).toBeInTheDocument();

        // El editor JSON (textarea con font-mono) ya no existe
        expect(document.querySelector("textarea.font-mono")).toBeNull();
        // El nuevo encabezado de opciones está presente
        expect(screen.getByText("Opciones del producto")).toBeInTheDocument();
    });

    it("serializa la configuración normalizada al guardar cambios", async () => {
        renderModal();

        await waitFor(() => expect(screen.getByDisplayValue("10/11")).toBeInTheDocument());

        // Justificación obligatoria
        const justification = document.querySelector("textarea");
        expect(justification).not.toBeNull();
        fireEvent.change(justification!, { target: { value: "motivo de prueba" } });

        fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() => {
            expect(orderService.updateOrder).toHaveBeenCalledWith(
                "ORD001",
                expect.objectContaining({
                    justification: "motivo de prueba",
                    products: [
                        expect.objectContaining({
                            productId: "prod-1",
                            quantity: 1,
                            configuration: '{"Talla":"10/11","Nombre":"Paula","Destinatario":"Paula (es una prueba)"}',
                        }),
                    ],
                })
            );
        });
    });

    it("precarga el socio indicado en initialUserId al crear un pedido", async () => {
        vi.mocked(adminUserService.listUsers).mockResolvedValue({
            content: [{ id: "qaaiDOpd", name: "Paula", email: "paula@example.com" }],
            page: { totalElements: 1, totalPages: 1, number: 0, size: 1 },
        } as any);

        render(
            <OrderEditorModal
                order={null}
                isOpen
                onClose={vi.fn()}
                onSaved={vi.fn()}
                initialUserId="qaaiDOpd"
            />
        );

        await waitFor(() =>
            expect(screen.getByDisplayValue("Paula (paula@example.com)")).toBeInTheDocument()
        );
        expect(screen.getByText(/Socio seleccionado/)).toBeInTheDocument();
    });
});
