import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  VariableValueInput,
  dateInputValue,
  displayDate,
} from "./VariableValueInput";
import { parseSampleValue } from "./componentSamples";

describe("typed variable inputs", () => {
  it("uses numeric controls and preserves numeric sample types", () => {
    const change = vi.fn();
    render(
      <VariableValueInput
        kind="number"
        label="Precio"
        value="24"
        onChange={change}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "18.5" },
    });
    expect(change).toHaveBeenCalledWith("18.5");
    expect(parseSampleValue("number", "18.5")).toBe(18.5);
  });
  it("reports malformed JSON and rejects the wrong structure", () => {
    const { rerender } = render(
      <VariableValueInput
        kind="array"
        label="Productos"
        value="{"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Productos")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa el JSON");
    expect(() => parseSampleValue("array", "{}")).toThrow();
    rerender(
      <VariableValueInput
        kind="array"
        label="Productos"
        value='[{"precio":12}]'
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(parseSampleValue("array", '[{"precio":12}]')).toEqual([
      { precio: 12 },
    ]);
  });
  it("uses color pickers, image URLs and boolean selectors", () => {
    const { rerender } = render(
      <VariableValueInput
        kind="color"
        label="Color"
        value="#23834d"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Seleccionar color: Color")).toHaveAttribute(
      "type",
      "color",
    );
    rerender(
      <VariableValueInput
        kind="image"
        label="Logo"
        value="/logo.png"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Logo")).toHaveAttribute("type", "url");
    expect(screen.getByAltText("Vista previa de la imagen")).toHaveAttribute(
      "src",
      "/logo.png",
    );
    rerender(
      <VariableValueInput
        kind="boolean"
        label="Visible"
        value="false"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("false");
    expect(parseSampleValue("boolean", "false")).toBe(false);
  });
  it("retains date formatting and refuses impossible dates and unsafe image URLs", () => {
    expect(dateInputValue("13/11/2026 10:00")).toBe("2026-11-13T10:00");
    expect(displayDate("2026-11-13T10:00")).toBe("13/11/2026 10:00");
    expect(() => parseSampleValue("date", "2026-02-31")).toThrow();
    expect(parseSampleValue("datetime", "2026-11-13T10:00")).toBe(
      "2026-11-13T10:00",
    );
    expect(() => parseSampleValue("image", "javascript:alert(1)")).toThrow();
  });
});
