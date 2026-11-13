import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ allowed: true, list: vi.fn(), editor: vi.fn() }));
vi.mock("~/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, hasPermission: () => state.allowed }) }));
vi.mock("~/services/emailCommonElementService", () => ({ emailCommonElementService: { list: state.list } }));
vi.mock("mailcanvas", () => ({ EmailEditor: (props: Record<string, unknown>) => {
  state.editor(props);
  return <div>{props.navigation as React.ReactNode}<button onClick={() => (props.onChange as (value: string) => void)("<p>Editado</p>")}>Editar correo</button></div>;
} }));
import { YamboEmailEditor } from "./YamboEmailEditor";

describe("YamboEmailEditor", () => {
  beforeEach(() => { state.allowed = true; state.list.mockReset().mockResolvedValue([]); state.editor.mockClear(); });
  it("passes controlled content, template identity and callbacks through the lazy editor", async () => {
    const onChange = vi.fn();
    render(<YamboEmailEditor value="<p>Hola</p>" onChange={onChange} templateKey="invitation" title="Invitación" />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar correo" }));
    expect(onChange).toHaveBeenCalledWith("<p>Editado</p>");
    expect(state.editor).toHaveBeenLastCalledWith(expect.objectContaining({ value: "<p>Hola</p>", templateKey: "invitation" }));
  });
  it("does not request components without email_common read permission", async () => {
    state.allowed = false;
    render(<YamboEmailEditor value="" onChange={vi.fn()} />);
    await screen.findByRole("button", { name: "Editar correo" });
    expect(state.list).not.toHaveBeenCalled();
  });
  it("keeps editing available after failure and retries loading the library", async () => {
    state.list.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([
      { key: "firma", name: "Firma", description: null, html: "<p>Equipo</p>", builtIn: false },
    ]);
    render(<YamboEmailEditor value="" onChange={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(state.editor).toHaveBeenLastCalledWith(expect.objectContaining({
      commonElements: expect.objectContaining({ components: [expect.objectContaining({ key: "firma" })] }),
    })));
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
  it("leaves fullscreen before opening an external reset confirmation", async () => {
    const onReset = vi.fn();
    render(<YamboEmailEditor value="" onChange={vi.fn()} onReset={onReset} />);
    await screen.findByRole("button", { name: "Editar correo" });
    const props = state.editor.mock.calls.at(-1)![0];
    expect(props.maximized).toBe(true);
    act(() => props.onReset());
    expect(onReset).toHaveBeenCalledOnce();
    expect(state.editor.mock.calls.at(-1)![0].maximized).toBe(false);
  });
  it("does not let a shared component insert itself", async () => {
    state.list.mockResolvedValue([{ key: "firma", name: "Firma", html: "<p>Firma</p>", builtIn: false }, { key: "footer", name: "Pie", html: "<p>Pie</p>", builtIn: true }]);
    render(<YamboEmailEditor value="" onChange={vi.fn()} excludeComponentKey="firma" />);
    await waitFor(() => expect(state.editor).toHaveBeenLastCalledWith(expect.objectContaining({ commonElements: expect.objectContaining({ components: [expect.objectContaining({ key: "footer" })] }) })));
  });
  it("does not add a second envelope around full editable documents", async () => {
    render(<YamboEmailEditor value={'<div data-yambo-email-document="v1"><p>Correo completo</p></div>'} onChange={vi.fn()} templateKey="invitation" />);
    await screen.findByRole("button", { name: "Editar correo" });
    expect(state.editor).toHaveBeenLastCalledWith(expect.objectContaining({ templateKey: "", commonElements: expect.objectContaining({ showEnvelopeHeader: false, headerHtml: "", footerHtml: "" }) }));
  });
  it("ignores responses from an unmounted editor", async () => {
    let resolve!: (items: never[]) => void;
    state.list.mockReturnValue(new Promise<never[]>((done) => { resolve = done; }));
    const { unmount } = render(<YamboEmailEditor value="" onChange={vi.fn()} />);
    await screen.findByRole("button", { name: "Editar correo" });
    unmount();
    await act(async () => resolve([]));
  });
});
