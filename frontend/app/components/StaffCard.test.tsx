import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffCard from "./StaffCard";
import type { StaffMember } from "~/services/publicService";

const member: StaffMember = {
    id: "U1",
    name: "Laura García",
    nickname: "Lau",
    photo: "",
    bio: "Estudio Magisterio.\n\nLlegué a Yambo de niña.",
    funFact: "Colecciono chapas",
    role: "MONITOR",
    groups: [{ id: "G1", name: null, projectName: "Barrio", role: "MONITOR" }],
};

describe("StaffCard", () => {
    it("shows the nickname instead of the full name on the card", () => {
        render(<StaffCard member={member} />);

        expect(screen.getByRole("heading", { name: "Lau" })).toBeInTheDocument();
        expect(screen.queryByText("Laura García")).not.toBeInTheDocument();
    });

    it("falls back to the name when there is no nickname", () => {
        render(<StaffCard member={{ ...member, nickname: null }} />);

        expect(screen.getByRole("heading", { name: "Laura García" })).toBeInTheDocument();
    });

    it("opens the profile with the full bio and fun fact on click", () => {
        render(<StaffCard member={member} />);
        expect(screen.queryByText("Colecciono chapas")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button"));

        expect(screen.getByText("Laura García")).toBeInTheDocument();
        expect(screen.getByText("Colecciono chapas")).toBeInTheDocument();
        expect(screen.getAllByText(/Llegué a Yambo de niña/)).toHaveLength(2);
    });
});
