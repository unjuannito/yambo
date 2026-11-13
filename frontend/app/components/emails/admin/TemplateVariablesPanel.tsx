import {
  VariableValueInput,
  dateInputValue,
  displayDate,
} from "../VariableValueInput";
import type { EmailTemplateToken } from "~/services/emailTemplateService";

const FIELDS = [
  {
    key: "headerTitle",
    label: "Título de la cabecera",
    description: "Texto que aparece en la parte superior del correo.",
  },
  {
    key: "headerColor",
    label: "Color de la cabecera",
    description: "Color de fondo, en formato #RRGGBB.",
  },
  {
    key: "emailDate",
    label: "Fecha de la cabecera",
    description:
      "Vacío: fecha y hora del envío. Selecciona una fecha solo si quieres fijarla.",
  },
];

export function TemplateVariablesPanel({
  tokens,
  values,
  onChange,
}: {
  tokens: EmailTemplateToken[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <legend className="px-2 font-semibold">Datos de la cabecera</legend>
      <p className="mb-4 text-sm text-gray-600">
        Estos valores alimentan las variables del editor y se usan al enviar.
        Vacío conserva el valor original del tipo de correo. Nombre de la
        organización y dominio se gestionan en Configuración.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {FIELDS.map(({ key, label, description }) => {
          const sample = tokens.find((token) => token.varName === key)?.sample;
          const id = `email-variable-${key}`;
          return (
            <div key={key}>
              <label htmlFor={id} className="block text-sm font-medium">
                {label}
              </label>
              <VariableValueInput
                kind={
                  key === "headerColor"
                    ? "color"
                    : key === "emailDate"
                      ? "datetime"
                      : "text"
                }
                id={id}
                label={label}
                describedBy={`${id}-help`}
                value={
                  key === "emailDate"
                    ? dateInputValue(values[key] ?? "")
                    : (values[key] ?? "")
                }
                placeholder={
                  key === "emailDate"
                    ? "Automática al enviar"
                    : String(sample ?? "")
                }
                onChange={(value) => {
                  const next = { ...values };
                  if (value)
                    next[key] =
                      key === "emailDate" ? displayDate(value) : value;
                  else delete next[key];
                  onChange(next);
                }}
              />
              <p id={`${id}-help`} className="mt-1 text-xs text-gray-500">
                {description} <code>{"${" + key + "}"}</code>
              </p>
              {values[key] && (
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-yambo-green-700 underline"
                  onClick={() => {
                    const next = { ...values };
                    delete next[key];
                    onChange(next);
                  }}
                >
                  Usar valor original
                </button>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
