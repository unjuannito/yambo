import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IssueCommentForm } from "./IssueCommentForm";
import { IssueStatus } from "~/types/issueType";
import { issueService } from "~/services/issueService";

vi.mock("~/services/issueService", () => ({
    issueService: {
        addComment: vi.fn(),
    },
}));

describe("IssueCommentForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("submits comment successfully", async () => {
        vi.mocked(issueService.addComment).mockResolvedValue({} as any);
        const onSuccess = vi.fn();

        render(
            <IssueCommentForm
                issueId="ISS-1"
                currentStatus={IssueStatus.OPEN}
                onSuccess={onSuccess}
            />,
        );

        fireEvent.change(screen.getByLabelText("Contenido del mensaje"), {
            target: { value: "Comentario de prueba" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

        await waitFor(() => {
            expect(issueService.addComment).toHaveBeenCalledWith("ISS-1", {
                text: "Comentario de prueba",
                status: undefined,
            });
        });

        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("shows validation error when trying to submit empty comment", async () => {
        vi.mocked(issueService.addComment).mockResolvedValue({} as any);

        render(
            <IssueCommentForm
                issueId="ISS-1"
                currentStatus={IssueStatus.OPEN}
                onSuccess={vi.fn()}
            />,
        );

        // Submit the form directly since the submit button is disabled when empty
        fireEvent.submit(screen.getByRole("textbox").closest("form")!);

        await waitFor(() => {
            expect(screen.getByText("¡No nos dejes en ascuas! Escribe algo o sube una imagen")).toBeInTheDocument();
        });

        expect(issueService.addComment).not.toHaveBeenCalled();
    });

    it("shows Abierto option when current status is closed", () => {
        render(
            <IssueCommentForm
                issueId="ISS-2"
                currentStatus={IssueStatus.CLOSED}
                canUpdateStatus
                onSuccess={vi.fn()}
            />,
        );

        expect(screen.getByRole("option", { name: "Abierto" })).toBeInTheDocument();
    });

    it("submits selected reopened transition status", async () => {
        vi.mocked(issueService.addComment).mockResolvedValue({} as any);

        const { container } = render(
            <IssueCommentForm
                issueId="ISS-3"
                currentStatus={IssueStatus.CLOSED}
                canUpdateStatus
                onSuccess={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByLabelText("Contenido del mensaje"), {
            target: { value: "Reabriendo para revisar" },
        });
        fireEvent.change(container.querySelector('select')!, {
            target: { value: IssueStatus.OPEN },
        });
        fireEvent.click(screen.getByRole("button", { name: "Enviar mensaje" }));

        await waitFor(() => {
            expect(issueService.addComment).toHaveBeenCalledWith("ISS-3", {
                text: "Reabriendo para revisar",
                status: IssueStatus.OPEN,
            });
        });
    });
});
