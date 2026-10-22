import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import IssueDetailPage from "./$issueId";

const useParamsMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("react-router", () => ({
    useParams: () => useParamsMock(),
}));

vi.mock("~/hooks/useAuth", () => ({
    useAuth: () => useAuthMock(),
}));

vi.mock("~/services/issueService", () => ({
    issueService: {
        getIssue: vi.fn().mockRejectedValue(new Error("not found")),
        getAllIssues: vi.fn().mockResolvedValue({ content: [] }),
        getWatchers: vi.fn().mockResolvedValue([]),
        addWatcher: vi.fn(),
        removeWatcher: vi.fn(),
    },
}));

vi.mock("~/components/issues", () => ({
    IssueStatusBadge: () => null,
    IssueCommentForm: () => null,
    IssueSidebarInfo: () => null,
    IssueChatMessage: () => null,
}));

describe("Issue Detail Route", () => {
    it("shows loading state when issueId is missing", () => {
        useParamsMock.mockReturnValue({});
        useAuthMock.mockReturnValue({ user: null });

        render(<IssueDetailPage />);

        expect(screen.getByText("Cargando incidencia...")).toBeInTheDocument();
    });

    it("shows error message when issue fails to load", async () => {
        useParamsMock.mockReturnValue({ issueId: "ISS-99" });
        useAuthMock.mockReturnValue({
            user: {
                permissions: [{ obj: "issue", actions: ["update"] }],
            },
        });

        render(<IssueDetailPage />);

        expect(await screen.findByText("not found")).toBeInTheDocument();
    });
});
