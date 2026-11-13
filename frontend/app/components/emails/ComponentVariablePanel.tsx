import { VariableValueInput } from "./VariableValueInput";
import { useState } from "react";
import {
  SAMPLE_VALUES as generated,
  isVariableName,
  sampleType,
  type SampleKind,
} from "./componentSamples";
import type { ComponentSamples } from "./useComponentSamples";

type Props = {
  sampleState: ComponentSamples;
  onInsert: (name: string) => void;
};
export function ComponentVariablePanel({ sampleState, onInsert }: Props) {
  const { tokens, draft, error, updateSamples } = sampleState;
  const [search, setSearch] = useState("");
  const [exampleName, setExampleName] = useState("");
  const [exampleType, setExampleType] = useState<SampleKind>("text");
  const [exampleValue, setExampleValue] = useState("Ejemplo");
  const [exampleError, setExampleError] = useState("");
  const addExample = () => {
    if (!isVariableName(exampleName)) {
      setExampleError("Escribe un nombre sin espacios, por ejemplo productos.");
      return;
    }
    try {
      sampleState.addExample(exampleName, exampleType, exampleValue);
      setSearch(exampleName);
      setExampleName("");
      setExampleError("");
    } catch {
      setExampleError(
        "El valor no coincide con el tipo seleccionado. Puedes generar un ejemplo.",
      );
    }
  };
  return (
    <aside
      aria-label="Variables del componente"
      className="border-t border-gray-100 bg-gray-50/70 p-5 xl:border-l xl:border-t-0"
    >
      <h3 className="font-semibold">Variables</h3>
      <p className="mb-3 mt-1 text-xs leading-relaxed text-gray-500">
        Pulsa una variable para insertarla. La pestaña Variables del editor
        muestra también objetos y listas.
      </p>
      <input
        type="search"
        aria-label="Buscar variables del componente"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar variable…"
        className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      />
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {tokens
          .filter((token) =>
            token.varName.toLowerCase().includes(search.toLowerCase()),
          )
          .map((token) => (
            <button
              type="button"
              key={token.varName}
              aria-label={`Insertar variable ${token.varName}`}
              onClick={() => onInsert(token.varName)}
              className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left hover:border-yambo-green-400"
            >
              <span className="flex items-center justify-between gap-2">
                <code className="truncate text-xs">
                  {"${" + token.varName + "}"}
                </code>
                <small className="text-[10px] text-gray-400">
                  {sampleType(token.sample)}
                </small>
              </span>
            </button>
          ))}
      </div>
      <details className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold text-gray-600">
          Nueva variable de ejemplo
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-gray-500">
            Nombre de variable
            <input
              aria-label="Nombre de variable de ejemplo"
              value={exampleName}
              maxLength={80}
              onChange={(event) => setExampleName(event.target.value)}
              placeholder="productos"
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Tipo
            <select
              aria-label="Tipo de variable de ejemplo"
              value={exampleType}
              onChange={(event) => {
                setExampleType(event.target.value as SampleKind);
                setExampleValue(generated[event.target.value as SampleKind]);
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
            >
              <option value="text">Texto</option>
              <option value="email">Email</option>
              <option value="url">Enlace</option>
              <option value="image">Imagen (URL)</option>
              <option value="date">Fecha</option>
              <option value="datetime">Fecha y hora</option>
              <option value="color">Color</option>
              <option value="number">Número</option>
              <option value="boolean">Booleano</option>
              <option value="object">Objeto</option>
              <option value="array">Lista / array</option>
            </select>
          </label>
          <div className="block text-xs text-gray-500">
            <span>Valor</span>
            <VariableValueInput
              kind={exampleType}
              label="Valor de variable de ejemplo"
              value={exampleValue}
              onChange={setExampleValue}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExampleValue(generated[exampleType])}
              className="text-xs font-medium text-gray-500 underline"
            >
              Generar ejemplo
            </button>
            <button
              type="button"
              onClick={addExample}
              className="ml-auto rounded-lg bg-yambo-green-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Añadir ejemplo
            </button>
          </div>
          {exampleError && (
            <p role="alert" className="text-xs text-red-600">
              {exampleError}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-gray-400">
            Son datos de prueba de esta sesión; no crean variables nuevas en el
            envío.
          </p>
        </div>
      </details>
      <details className="mt-5">
        <summary className="cursor-pointer text-xs font-semibold text-gray-600">
          Editar datos de ejemplo
        </summary>
        <p className="my-2 text-xs leading-relaxed text-gray-500">
          Solo afectan a la vista previa. En el envío se usan los datos de la
          plantilla; el nombre de cada variable debe existir en ella.
        </p>
        <textarea
          aria-label="Datos de ejemplo del componente"
          maxLength={32768}
          value={draft}
          onChange={(event) => updateSamples(event.target.value)}
          spellCheck={false}
          rows={12}
          aria-invalid={!!error}
          aria-describedby={error ? "component-sample-error" : undefined}
          className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-xs"
        />
        {error && (
          <p
            id="component-sample-error"
            role="alert"
            className="mt-2 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </details>
    </aside>
  );
}
