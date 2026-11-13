import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("./YamboEmailEditor", () => ({ YamboEmailEditor: ({ value, onChange, tokens }: { value: string; onChange: (value: string) => void; tokens: unknown }) => <><textarea aria-label="HTML del componente" value={value} onChange={(event) => onChange(event.target.value)} /><output aria-label="Variables disponibles">{JSON.stringify(tokens)}</output></> }));
import { ComponentComposer } from "./ComponentComposer";
function Harness({ save = vi.fn() }: {save?: () => void}) {
  const [form, setForm] = useState({name: "", description: "", html: ""});
  return <ComponentComposer form={form} setForm={setForm} saving={false} onSave={save} onClose={vi.fn()} />;
}
describe("component creation", () => {
  it("offers a usable starter and appends blocks without deleting existing work", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Añadir bloque firma" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Firma");
    expect((screen.getByLabelText("HTML del componente") as HTMLTextAreaElement).value).toContain("organizationName");
    fireEvent.click(screen.getByRole("button", { name: "Añadir bloque aviso" }));
    expect((screen.getByLabelText("HTML del componente") as HTMLTextAreaElement).value).toContain("organizationName");
    expect((screen.getByLabelText("HTML del componente") as HTMLTextAreaElement).value).toContain("Información importante");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
  it("generates a typed list example without requiring JSON editing", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Nueva variable de ejemplo"));
    fireEvent.change(screen.getByLabelText("Nombre de variable de ejemplo"), {target: {value: "productos"}});
    fireEvent.change(screen.getByLabelText("Tipo de variable de ejemplo"), {target: {value: "array"}});
    fireEvent.click(screen.getByRole("button", {name: "Generar ejemplo"}));
    fireEvent.click(screen.getByRole("button", {name: "Añadir ejemplo"}));
    expect(screen.getByRole("button", {name: "Insertar variable productos"})).toHaveTextContent("Lista");
  });
  it("inserts variables as bindings and keeps structured examples typed", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Insertar variable organizationName" }));
    expect((screen.getByLabelText("HTML del componente") as HTMLTextAreaElement).value).toContain('th:text="${organizationName}"');
    fireEvent.click(screen.getByText("Editar datos de ejemplo"));
    fireEvent.change(screen.getByLabelText("Datos de ejemplo del componente"), {target: {value: '{"person":{"name":"Ana"},"products":[{"name":"Bolso","price":12}]}'}});
    expect(screen.getByRole("button", {name: "Insertar variable products"})).toHaveTextContent("Lista");
    expect(screen.getByRole("button", {name: "Insertar variable person"})).toHaveTextContent("Objeto");
    fireEvent.change(screen.getByLabelText("Datos de ejemplo del componente"), {target: {value: '{oops'}});
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Insertar variable products"})).toBeInTheDocument();
  });
});
