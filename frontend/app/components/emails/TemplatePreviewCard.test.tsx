import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock("~/services/emailTemplateService", () => ({ emailTemplateService: { preview: state.preview } }));
import { TemplatePreviewCard } from "./TemplatePreviewCard";
const template = { key: "invitation", displayName: "Invitación", description: "Invita a una persona", body: "<p>Original</p>", tokens: [], primaryLinkToken: null, overridden: false, subject: null };
describe("template preview card", () => {
  beforeEach(() => {
    state.preview.mockReset().mockResolvedValue({ html: "<p>Correo renderizado</p>" });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("loads only near the viewport and uses a sandboxed thumbnail", async () => {
    let intersect!: () => void;
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: (entries: { isIntersecting: boolean }[]) => void) { intersect = () => callback([{ isIntersecting: true }]); } observe() {} disconnect() {} });
    render(<TemplatePreviewCard template={template} canEdit onEdit={vi.fn()} />);
    expect(state.preview).not.toHaveBeenCalled();
    act(() => intersect());
    const frame = await screen.findByTitle("Miniatura de Invitación");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", "<p>Correo renderizado</p>");
    expect(state.preview).toHaveBeenCalledWith("invitation", template.body);
    expect(screen.queryByText(template.body)).not.toBeInTheDocument();
  });
  it("recovers from a failed preview request", async () => {
    state.preview.mockRejectedValueOnce(new Error("offline"));
    render(<TemplatePreviewCard template={template} canEdit onEdit={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByTitle("Miniatura de Invitación")).toBeInTheDocument();
    expect(state.preview).toHaveBeenCalledTimes(2);
  });
  it("opens an enlarged server preview and restores focus when closed", async () => {
    render(<TemplatePreviewCard template={template} canEdit={false} onEdit={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Vista previa de Invitación" }); trigger.focus(); fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Invitación" })).toBeInTheDocument();
    expect(await screen.findByTitle("Correo Invitación")).toHaveAttribute("sandbox", "");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });
  it("ignores an old render response after the body changes", async () => {
    let complete!: (value: {html: string}) => void;
    state.preview.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const view = render(<TemplatePreviewCard template={template} canEdit onEdit={vi.fn()} />);
    await waitFor(() => expect(state.preview).toHaveBeenCalledOnce());
    view.rerender(<TemplatePreviewCard template={{ ...template, body: "<p>Nuevo</p>" }} canEdit onEdit={vi.fn()} />);
    await screen.findByTitle("Miniatura de Invitación");
    await act(async () => complete({ html: "<p>Respuesta antigua</p>" }));
    expect(screen.getByTitle("Miniatura de Invitación")).toHaveAttribute("srcdoc", "<p>Correo renderizado</p>");
  });
});
