import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ getById: vi.fn(), listCommon: vi.fn(), createCommon: vi.fn(), updateCommon: vi.fn(), removeCommon: vi.fn(), resetCommon: vi.fn(), listTemplates: vi.fn(), previewTemplate: vi.fn(), commonOnly: false, toastError: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: { error: state.toastError, success: vi.fn() } }));
vi.mock("~/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, hasPermission: (permission: { obj: string } | { obj: string }[]) => !state.commonOnly || (Array.isArray(permission) ? permission.some((item) => item.obj === "email_common") : permission.obj === "email_common") }) }));
vi.mock("~/components/common/PageHeader", () => ({ PageHeader: () => null }));
vi.mock("~/components/common/PageContainer", () => ({ PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("~/components/emails/YamboEmailEditor", () => ({ YamboEmailEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <textarea aria-label="Cuerpo del editor" value={value} onChange={(event) => onChange(event.target.value)} /> }));
vi.mock("~/services/emailTemplateService", () => ({ emailTemplateService: { list: state.listTemplates, preview: state.previewTemplate } }));
vi.mock("~/services/campaignService", () => ({ campaignService: {
  list: async () => [{ id: "draft", subject: "Comunicado de prueba", body: null, audienceType: "ALL", status: "DRAFT", createdAt: null, sentAt: null }],
  getById: state.getById,
  variables: async () => [],
} }));
vi.mock("~/services/projectService", () => ({ projectService: { getAllProjects: async () => [], listProjects: async () => ({ content: [] }) } }));
vi.mock("~/services/profileService", () => ({ profileService: { getAllProfiles: async () => [] } }));
vi.mock("~/services/emailCommonElementService", () => ({ emailCommonElementService: { list: state.listCommon, create: state.createCommon, update: state.updateCommon, remove: state.removeCommon, reset: state.resetCommon } }));
import EmailsAdmin from "./index";

describe("email administration integration", () => {
  beforeEach(() => {
    state.commonOnly = false;
    state.toastError.mockClear();
    state.listTemplates.mockReset().mockResolvedValue([]);
    state.previewTemplate.mockReset().mockResolvedValue({html: "<h1>Preview</h1>"});
    state.listCommon.mockResolvedValue([{ key: "header", name: "Cabecera", html: "<h1>Yambo</h1>", builtIn: true }, { key: "firma", name: "Firma", html: "<p>Equipo</p>", builtIn: false }]);
    state.updateCommon.mockReset().mockResolvedValue({});
    state.createCommon.mockReset().mockResolvedValue({});
    state.removeCommon.mockReset().mockResolvedValue(undefined);
    state.resetCommon.mockReset().mockResolvedValue({ html: "<h1>Cabecera restaurada</h1>" });
  });
  it("shows the translated validation message when the campaign subject is blank", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Comunicados" }));
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo comunicado" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Asunto del comunicado" }), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(state.toastError).toHaveBeenCalledWith("Escribe un asunto para el comunicado.");
    expect(screen.getByRole("textbox", { name: "Asunto del comunicado" })).toHaveValue("   ");
  });
  it("offers recipient variables when composing a campaign and inserts them into the subject", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", {name:"Comunicados"}));
    fireEvent.click(await screen.findByRole("button", {name:"Nuevo comunicado"}));
    const input = screen.getByRole("textbox", {name:"Asunto del comunicado"});
    fireEvent.change(input, {target:{value:"Hola "}});
    (input as HTMLInputElement).setSelectionRange(5,5);
    fireEvent.click(screen.getByRole("button", {name:"Insertar nombre en asunto"}));
    expect(input).toHaveValue("Hola ${nombre}");
    expect(screen.getByText(/se sustituyen por los de cada destinatario/)).toBeInTheDocument();
  });
  it("filters the visual template catalog by category and search without showing source HTML", async () => {
    state.listTemplates.mockResolvedValue([
      {key: "invitation", displayName: "Invitación", description: "Acceso a tu cuenta", body: "<p>HTML interno</p>", tokens: [], overridden: false},
      {key: "order-confirmed", displayName: "Pago confirmado", description: "Pedido pagado", body: "<p>HTML interno</p>", tokens: [], overridden: true},
    ]);
    render(<EmailsAdmin />);
    expect(await screen.findByRole("article", {name: "Invitación"})).toBeInTheDocument();
    expect(screen.queryByText("<p>HTML interno</p>")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Pedidos", pressed: false}));
    expect(screen.queryByRole("article", {name: "Invitación"})).not.toBeInTheDocument();
    expect(screen.getByRole("article", {name: "Pago confirmado"})).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", {name: "Buscar plantillas"}), {target: {value: "inexistente"}});
    expect(screen.getByText(/No hay plantillas que coincidan/)).toBeInTheDocument();
  });
  it("recovers the shared component management tab and saves component HTML", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Elementos comunes" }));
    const name = await screen.findByRole("heading", { name: "Firma" });
    const card = name.closest(".overflow-hidden")! as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Editar" }));
    expect(await screen.findByLabelText("Cuerpo del editor")).toHaveValue("<p>Equipo</p>");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(state.updateCommon).toHaveBeenCalledWith("firma", { html: "<p>Equipo</p>" }));
  });
  it("creates a reusable component through the recovered form", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Elementos comunes" }));
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo componente" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Firma nueva" } });
    fireEvent.change(screen.getByLabelText("Cuerpo del editor"), { target: { value: "<p>Hola</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(state.createCommon).toHaveBeenCalledWith({ name: "Firma nueva", html: "<p>Hola</p>", description: null }));
  });
  it("deletes only after confirmation and keeps built-in components protected", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Elementos comunes" }));
    const heading = await screen.findByRole("heading", { name: "Firma" });
    fireEvent.click(within(heading.closest(".overflow-hidden")! as HTMLElement).getByRole("button", { name: "Editar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(state.removeCommon).not.toHaveBeenCalled();
    const title = screen.getByRole("heading", { name: "Eliminar componente" });
    fireEvent.click(within(title.parentElement!).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(state.removeCommon).toHaveBeenCalledWith("firma"));
  });
  it("restores the built-in header after confirmation", async () => {
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Elementos comunes" }));
    const heading = await screen.findByRole("heading", { name: /Cabecera/ });
    fireEvent.click(within(heading.closest(".overflow-hidden")! as HTMLElement).getByRole("button", { name: "Editar" }));
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(state.resetCommon).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole("button", { name: "Restablecer" });
    fireEvent.click(buttons.at(-1)!);
    await waitFor(() => expect(state.resetCommon).toHaveBeenCalledWith("header"));
    expect(screen.getByLabelText("Cuerpo del editor")).toHaveValue("<h1>Cabecera restaurada</h1>");
  });
  it("allows access with only shared component permissions", async () => {
    state.commonOnly = true;
    render(<EmailsAdmin />);
    expect(await screen.findByRole("heading", { name: "Firma" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Plantillas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Comunicados" })).not.toBeInTheDocument();
  });
  it("loads the full campaign body before opening the editor when the list omits it", async () => {
    let resolve!: (draft: unknown) => void;
    state.getById.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<EmailsAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "Comunicados" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    expect(state.getById).toHaveBeenCalledWith("draft");
    expect(screen.queryByLabelText("Cuerpo del editor")).not.toBeInTheDocument();
    await act(async () => resolve({ id: "draft", subject: "Comunicado de prueba", body: "<p>Contenido completo</p>", audienceType: "ALL", audienceRef: null, audienceUsers: [] }));
    expect(await screen.findByLabelText("Cuerpo del editor")).toHaveValue("<p>Contenido completo</p>");
  });
});
