import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnsavedChangesGuard, UnsavedChangesNotice } from "./UnsavedChanges";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

// El bloqueo de navegación lo pone el router: aquí se simula su estado
const blocker = { state: "unblocked", proceed: vi.fn(), reset: vi.fn() };
const useBlocker = vi.fn((_when: boolean) => blocker);
vi.mock("react-router", () => ({
    useBlocker: (when: boolean) => useBlocker(when),
}));

describe("UnsavedChanges", () => {
    beforeEach(() => {
        blocker.state = "unblocked";
        blocker.proceed.mockClear();
        blocker.reset.mockClear();
        useBlocker.mockClear();
    });

    it("shows the notice only while there are changes", () => {
        const { rerender } = render(<UnsavedChangesNotice show={false} />);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();

        rerender(<UnsavedChangesNotice show />);
        expect(screen.getByRole("status")).toHaveTextContent("unsavedChanges.notice");
    });

    it("blocks navigation only while there are changes", () => {
        const { rerender } = render(<UnsavedChangesGuard when={false} />);
        expect(useBlocker).toHaveBeenLastCalledWith(false);
        expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();

        rerender(<UnsavedChangesGuard when />);
        expect(useBlocker).toHaveBeenLastCalledWith(true);
    });

    it("asks before leaving and lets the user stay or leave", () => {
        blocker.state = "blocked";
        render(<UnsavedChangesGuard when />);
        expect(screen.getByText("unsavedChanges.title")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.stay" }));
        expect(blocker.reset).toHaveBeenCalledTimes(1);
        expect(blocker.proceed).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "unsavedChanges.leave" }));
        expect(blocker.proceed).toHaveBeenCalledTimes(1);
    });

    it("lets a pending navigation through once the changes are saved", () => {
        blocker.state = "blocked";
        render(<UnsavedChangesGuard when={false} />);
        expect(blocker.proceed).toHaveBeenCalledTimes(1);
    });

    it("lets the browser warn on closing the tab only while there are changes", () => {
        const add = vi.spyOn(window, "addEventListener");
        const { rerender } = render(<UnsavedChangesGuard when={false} />);
        expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(false);

        rerender(<UnsavedChangesGuard when />);
        expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true);
        add.mockRestore();
    });
});
