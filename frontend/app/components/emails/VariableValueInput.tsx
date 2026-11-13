import { useId } from "react";
import type { SampleKind } from "./componentSamples";

const controlClass =
  "mt-1 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-400";

export function dateInputValue(value: string): string {
  const legacy = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})$/);
  return legacy ? `${legacy[3]}-${legacy[2]}-${legacy[1]}T${legacy[4]}` : value;
}
export function displayDate(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]} ${iso[4]}` : value;
}

export function VariableValueInput({
  kind,
  label,
  value,
  onChange,
  id,
  describedBy,
  placeholder,
}: {
  kind: SampleKind;
  label: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  describedBy?: string;
  placeholder?: string;
}) {
  const errorId = useId();
  const common = {
    id,
    "aria-label": label,
    "aria-describedby": describedBy,
    className: controlClass,
  };
  if (kind === "object" || kind === "array") {
    let error = "";
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        kind === "array"
          ? !Array.isArray(parsed)
          : !parsed || typeof parsed !== "object" || Array.isArray(parsed)
      )
        error =
          kind === "array"
            ? "Usa una lista JSON: […]."
            : "Usa un objeto JSON: {…}.";
    } catch {
      error = "Revisa el JSON: falta una coma, una comilla o una llave.";
    }
    return (
      <div>
        <textarea
          {...common}
          rows={5}
          maxLength={8000}
          value={value}
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={
            [describedBy, error ? errorId : ""].filter(Boolean).join(" ") ||
            undefined
          }
          onChange={(event) => onChange(event.target.value)}
          style={{ fontFamily: "monospace" }}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
  if (kind === "boolean")
    return (
      <select
        {...common}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="true">Sí (verdadero)</option>
        <option value="false">No (falso)</option>
      </select>
    );
  if (kind === "color")
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Seleccionar color: ${label}`}
          className="mt-1 h-10 w-12 shrink-0 cursor-pointer rounded border border-gray-300"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          {...common}
          value={value}
          placeholder={placeholder ?? "#RRGGBB"}
          pattern="#[0-9a-fA-F]{6}"
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  const type =
    kind === "datetime"
      ? "datetime-local"
      : kind === "image" || kind === "url"
        ? "url"
        : kind === "text"
          ? "text"
          : kind;
  return (
    <div>
      <input
        {...common}
        type={type}
        value={value}
        placeholder={placeholder}
        step={kind === "number" ? "any" : undefined}
        maxLength={kind === "text" ? 200 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {kind === "image" && /^(https?:\/\/|\/(?!\/))/i.test(value) && (
        <img
          src={value}
          alt="Vista previa de la imagen"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mt-2 max-h-32 max-w-full rounded-lg object-contain"
        />
      )}
    </div>
  );
}
