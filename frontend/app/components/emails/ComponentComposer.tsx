import { useMemo, useState } from "react";
import InputComponent from "~/components/common/forms/InputComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { YamboEmailEditor } from "./YamboEmailEditor";
import { COMPONENT_SAMPLE_DATA, COMPONENT_STARTERS, componentTokens, sampleType } from "./componentSamples";

type Form = { name: string; html: string; description: string };
export function ComponentComposer({ form, setForm, saving, onSave, onClose }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; saving: boolean; onSave: () => void; onClose: () => void }) {
  const [samples, setSamples] = useState(COMPONENT_SAMPLE_DATA);
  const [draft, setDraft] = useState(() => JSON.stringify(COMPONENT_SAMPLE_DATA, null, 2));
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [exampleName, setExampleName] = useState("");
  const [exampleType, setExampleType] = useState("text");
  const [exampleValue, setExampleValue] = useState("Ejemplo");
  const [exampleError, setExampleError] = useState("");
  const generated: Record<string, string> = { text: "Ejemplo", number: "42", boolean: "true", object: '{"nombre":"Lucía","email":"lucia@example.com"}', array: '[{"nombre":"Bolso","precio":24},{"nombre":"Cuaderno","precio":12}]' };
  const addExample = () => {
    if (!/^[a-zA-Z_$][\w$]*$/.test(exampleName)) { setExampleError("Escribe un nombre sin espacios, por ejemplo productos."); return; }
    try {
      const value: unknown = exampleType === "text" ? exampleValue : JSON.parse(exampleValue);
      if ((exampleType === "number" && (typeof value !== "number" || !Number.isFinite(value))) || (exampleType === "boolean" && typeof value !== "boolean") || (exampleType === "array" && !Array.isArray(value)) || (exampleType === "object" && (!value || typeof value !== "object" || Array.isArray(value)))) throw new Error();
      const data = { ...samples, [exampleName]: value };
      setSamples(data); setDraft(JSON.stringify(data, null, 2)); setError(""); setSearch(exampleName); setExampleName(""); setExampleError("");
    } catch { setExampleError("El valor no coincide con el tipo seleccionado. Puedes generar un ejemplo."); }
  };
  const tokens = useMemo(() => componentTokens(samples), [samples]);
  const valid = !!form.name.trim() && !!form.html.trim() && !saving;
  const updateSamples = (value: string) => {
    setDraft(value);
    try {
      const data: unknown = JSON.parse(value);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Usa un objeto JSON con los nombres de tus variables.");
      if (Object.keys(data).some((key) => !/^[a-zA-Z_$][\w$]*$/.test(key))) throw new Error("Los nombres deben empezar por una letra y no contener espacios.");
      setSamples(data as Record<string, unknown>); setError("");
    } catch (err) { setError(err instanceof SyntaxError ? "Revisa el JSON: falta una coma, una comilla o una llave." : (err as Error).message); }
  };
  return <section aria-label="Crear componente" className="overflow-hidden rounded-2xl border border-yambo-green-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5"><div><h2 className="text-lg font-semibold">Nuevo componente</h2><p className="mt-1 text-sm text-gray-500">Diseña una vez y reutilízalo en tus correos.</p></div><button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button></header>
    <div className="grid gap-5 p-6 md:grid-cols-2"><InputComponent id="email-component-name" label="Nombre" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Por ejemplo, Firma del equipo" aria-required="true" /><InputComponent id="email-component-description" label="Descripción (opcional)" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Cuándo y dónde lo vas a utilizar" /></div>
    <div className="px-6 pb-6"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Empieza con un bloque</p><div className="grid gap-3 sm:grid-cols-3">{COMPONENT_STARTERS.map((starter) => <button type="button" key={starter.name} aria-label={`Añadir bloque ${starter.name.toLocaleLowerCase()}`} onClick={() => setForm((value) => ({ ...value, name: value.name || starter.name, html: value.html + starter.html }))} className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-yambo-green-400 hover:bg-yambo-green-50 focus-visible:outline-yambo-green-500"><strong className="block text-sm">+ {starter.name}</strong><span className="mt-1 block text-xs text-gray-500">{starter.description}</span></button>)}</div></div>
    <div className="grid items-start border-t border-gray-100 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 p-4"><YamboEmailEditor value={form.html} onChange={(html) => setForm((value) => ({ ...value, html }))} tokens={tokens} defaultMaximized={false} title="Nuevo componente" onSave={valid ? onSave : undefined} /></div>
      <aside aria-label="Variables del componente" className="border-t border-gray-100 bg-gray-50/70 p-5 xl:border-l xl:border-t-0"><h3 className="font-semibold">Variables</h3><p className="mb-3 mt-1 text-xs leading-relaxed text-gray-500">Pulsa una variable para insertarla. La pestaña Variables del editor muestra también objetos y listas.</p><input type="search" aria-label="Buscar variables del componente" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar variable…" className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" /><div className="max-h-64 space-y-2 overflow-y-auto">{tokens.filter((token) => token.varName.toLowerCase().includes(search.toLowerCase())).map((token) => <button type="button" key={token.varName} aria-label={`Insertar variable ${token.varName}`} onClick={() => setForm((value) => ({ ...value, html: value.html + '<p><span th:text="${' + token.varName + '}"></span></p>' }))} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left hover:border-yambo-green-400"><span className="flex items-center justify-between gap-2"><code className="truncate text-xs">{'${' + token.varName + '}'}</code><small className="text-[10px] text-gray-400">{sampleType(token.sample)}</small></span></button>)}</div>
        <details className="mt-4 rounded-lg border border-gray-200 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-gray-600">Nueva variable de ejemplo</summary><div className="mt-3 space-y-3">
          <label className="block text-xs text-gray-500">Nombre de variable<input aria-label="Nombre de variable de ejemplo" value={exampleName} maxLength={80} onChange={(event) => setExampleName(event.target.value)} placeholder="productos" className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm" /></label>
          <label className="block text-xs text-gray-500">Tipo<select aria-label="Tipo de variable de ejemplo" value={exampleType} onChange={(event) => { setExampleType(event.target.value); setExampleValue(generated[event.target.value]); }} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"><option value="text">Texto</option><option value="number">Número</option><option value="boolean">Booleano</option><option value="object">Objeto</option><option value="array">Lista / array</option></select></label>
          <label className="block text-xs text-gray-500">Valor<textarea aria-label="Valor de variable de ejemplo" value={exampleValue} rows={3} maxLength={8000} onChange={(event) => setExampleValue(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 p-2 font-mono text-xs" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExampleValue(generated[exampleType])} className="text-xs font-medium text-gray-500 underline">Generar ejemplo</button><button type="button" onClick={addExample} className="ml-auto rounded-lg bg-yambo-green-600 px-3 py-2 text-xs font-semibold text-white">Añadir ejemplo</button></div>{exampleError && <p role="alert" className="text-xs text-red-600">{exampleError}</p>}
          <p className="text-[11px] leading-relaxed text-gray-400">Son datos de prueba de esta sesión; no crean variables nuevas en el envío.</p>
        </div></details>
        <details className="mt-5"><summary className="cursor-pointer text-xs font-semibold text-gray-600">Editar datos de ejemplo</summary><p className="my-2 text-xs leading-relaxed text-gray-500">Solo afectan a la vista previa. En el envío se usan los datos de la plantilla; el nombre de cada variable debe existir en ella.</p><textarea aria-label="Datos de ejemplo del componente" maxLength={32768} value={draft} onChange={(event) => updateSamples(event.target.value)} spellCheck={false} rows={12} aria-invalid={!!error} aria-describedby={error ? "component-sample-error" : undefined} className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono text-xs" />{error && <p id="component-sample-error" role="alert" className="mt-2 text-xs text-red-600">{error}</p>}</details>
      </aside>
    </div>
    <footer className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4"><p className="text-xs text-gray-400">El componente aparecerá en Insertar → Componentes.</p><ButtonComponent onClick={onSave} variant="primary" isLoading={saving} disabled={!valid}>Guardar</ButtonComponent></footer>
  </section>;
}
