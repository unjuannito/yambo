import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { ComponentVariablePanel } from "./ComponentVariablePanel";
import { YamboEmailEditor } from "./YamboEmailEditor";
import { COMPONENT_STARTERS } from "./componentSamples";
import { useComponentSamples } from "./useComponentSamples";

type Form = { name: string; html: string; description: string };
export function ComponentComposer({
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const sampleState = useComponentSamples();
  const tokens = sampleState.tokens;
  const valid = !!form.name.trim() && !!form.html.trim() && !saving;
  return (
    <section
      aria-label="Crear componente"
      className="overflow-hidden rounded-2xl border border-yambo-green-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold">Nuevo componente</h2>
          <p className="mt-1 text-sm text-gray-500">
            Diseña una vez y reutilízalo en tus correos.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </header>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <InputComponent
          id="email-component-name"
          label="Nombre"
          value={form.name}
          onChange={(event) =>
            setForm((value) => ({ ...value, name: event.target.value }))
          }
          placeholder="Por ejemplo, Firma del equipo"
          aria-required="true"
        />
        <InputComponent
          id="email-component-description"
          label="Descripción (opcional)"
          value={form.description}
          onChange={(event) =>
            setForm((value) => ({ ...value, description: event.target.value }))
          }
          placeholder="Cuándo y dónde lo vas a utilizar"
        />
      </div>
      <div className="px-6 pb-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Empieza con un bloque
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPONENT_STARTERS.map((starter) => (
            <button
              type="button"
              key={starter.name}
              aria-label={`Añadir bloque ${starter.name.toLocaleLowerCase()}`}
              onClick={() =>
                setForm((value) => ({
                  ...value,
                  name: value.name || starter.name,
                  html: value.html + starter.html,
                }))
              }
              className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-yambo-green-400 hover:bg-yambo-green-50 focus-visible:outline-yambo-green-500"
            >
              <strong className="block text-sm">+ {starter.name}</strong>
              <span className="mt-1 block text-xs text-gray-500">
                {starter.description}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid items-start border-t border-gray-100 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 p-4">
          <YamboEmailEditor
            value={form.html}
            onChange={(html) => setForm((value) => ({ ...value, html }))}
            tokens={tokens}
            defaultMaximized={false}
            title="Nuevo componente"
            onSave={valid ? onSave : undefined}
          />
        </div>
        <ComponentVariablePanel
          sampleState={sampleState}
          onInsert={(name) =>
            setForm((value) => ({
              ...value,
              html:
                value.html + '<p><span th:text="${' + name + '}"></span></p>',
            }))
          }
        />
      </div>
      <footer className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-4">
        <p className="text-xs text-gray-400">
          El componente aparecerá en Insertar → Componentes.
        </p>
        <ButtonComponent
          onClick={onSave}
          variant="primary"
          isLoading={saving}
          disabled={!valid}
        >
          Guardar
        </ButtonComponent>
      </footer>
    </section>
  );
}
