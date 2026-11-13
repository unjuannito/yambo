import { useRef, useState } from "react";
import type { EmailTemplateView } from "~/services/emailTemplateService";
import { EmailPreviewDialog } from "./EmailPreviewDialog";
import { useEmailPreview, type PreviewLoader } from "./useEmailPreview";

export function templateCategory(key: string) {
  return key.startsWith("order-")
    ? "Pedidos"
    : key.startsWith("issue-")
      ? "Incidencias"
      : key.startsWith("activity-")
        ? "Actividades"
        : "Acceso y cuentas";
}

/** Real server render, loaded only when the card approaches the viewport. */
export function TemplatePreviewCard({
  template,
  canEdit,
  onEdit,
  loadPreview,
  categoryLabel,
  statusLabel,
}: {
  template: EmailTemplateView;
  canEdit: boolean;
  onEdit: () => void;
  loadPreview?: PreviewLoader;
  categoryLabel?: string;
  statusLabel?: string;
}) {
  const { card, html, error, width, activate, retry } = useEmailPreview({
    templateKey: template.key,
    body: template.body,
    loadPreview,
  });
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const preview = () => {
    opener.current = document.activeElement as HTMLElement;
    activate();
    setOpen(true);
  };
  const status = error ? (
    <div className="p-5 text-center text-sm text-gray-500">
      <p>No se pudo cargar la vista previa.</p>
      <button
        type="button"
        className="mt-2 font-semibold text-yambo-green-700 underline"
        onClick={retry}
      >
        Reintentar
      </button>
    </div>
  ) : (
    <div role="status" className="p-6 text-center text-sm text-gray-400">
      Preparando vista previa…
    </div>
  );
  return (
    <article
      ref={card}
      aria-label={template.displayName}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-60 overflow-hidden border-b border-gray-100 bg-slate-100">
        {html ? (
          <iframe
            title={`Miniatura de ${template.displayName}`}
            sandbox=""
            srcDoc={html}
            tabIndex={-1}
            aria-hidden="true"
            loading="eager"
            style={{
              width: 600,
              height: 1000,
              transform: `scale(${width / 600})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              border: 0,
              background: "white",
            }}
          />
        ) : (
          status
        )}
        {!error && (
          <button
            type="button"
            onClick={preview}
            aria-label={`Vista previa de ${template.displayName}`}
            className="absolute inset-0 focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-yambo-green-500"
          >
            <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
              Ampliar ↗
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-gray-500">
            {categoryLabel ?? templateCategory(template.key)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 ${template.overridden ? "bg-yambo-green-50 text-yambo-green-700" : "bg-gray-100 text-gray-500"}`}
          >
            {statusLabel ??
              (template.overridden ? "Personalizada" : "Predeterminada")}
          </span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-yambo-black">
            {template.displayName}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
            {template.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={preview}
            className="rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-yambo-green-500"
          >
            Vista previa
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full bg-yambo-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yambo-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yambo-green-600"
            >
              Editar
            </button>
          )}
        </div>
      </div>
      {open && (
        <EmailPreviewDialog
          title={template.displayName}
          html={html}
          status={status}
          onClose={close}
        />
      )}
    </article>
  );
}
