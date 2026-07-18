import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusWorkflow } from "./StatusWorkflow";

describe("StatusWorkflow", () => {
    it("renders extra action edges outside the primary flow", () => {
        render(
            <StatusWorkflow
                title="Flujo incidencias"
                config={{
                    OPEN: { label: "Abierto", className: "bg-red-100 text-red-800" },
                    IN_PROGRESS: { label: "En Progreso", className: "bg-orange-100 text-orange-800" },
                    CLOSED: { label: "Cerrado", className: "bg-gray-200 text-gray-800" },
                }}
                transitions={{
                    OPEN: ["IN_PROGRESS", "CLOSED"],
                    IN_PROGRESS: ["OPEN", "CLOSED"],
                    CLOSED: ["OPEN"],
                }}
            />,
        );

        expect(screen.getByText("Acciones:")).toBeInTheDocument();
        expect(screen.getByText("Cerrado -> Abierto")).toBeInTheDocument();
    });
});
