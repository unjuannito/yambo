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

describe("StaffCard role badges", () => {
    it("labels coordination first and does not repeat a project without age groups", () => {
        const both: StaffMember = {
            ...member,
            role: "BOTH",
            groups: [
                { id: "G2", name: "Peques", projectName: "Barrio", role: "MONITOR" },
                { id: "G1", name: null, projectName: "Jambo", role: "MONITOR" },
                { id: "G1", name: null, projectName: "Jambo", role: "COORDINATOR" },
            ],
        };
        const { container } = render(<StaffCard member={both} />);

        const badges = [...container.querySelectorAll("span")].map((el) => el.textContent);
        expect(badges).toEqual(["Coordinador - Jambo", "Monitor en Barrio Peques", "Monitor en Jambo"]);
    });

    it("shows only the monitor groups of the project on a project page", () => {
        const both: StaffMember = {
            ...member,
            groups: [
                { id: "G1", name: null, projectName: "Barrio", role: "COORDINATOR" },
                { id: "G2", name: "Peques", projectName: "Barrio", role: "MONITOR" },
                { id: "G3", name: null, projectName: "Jambo", role: "MONITOR" },
            ],
        };
        const { container } = render(<StaffCard member={both} projectName="Barrio" />);

        expect([...container.querySelectorAll("span")].map((el) => el.textContent)).toEqual(["Peques"]);
    });
});
