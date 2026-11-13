import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  title: string;
  html: string | null;
  status: ReactNode;
  onClose: () => void;
};
export function EmailPreviewDialog({ title, html, status, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    dialog.current?.showModal?.();
  }, []);
  const close = () => {
    dialog.current?.close?.();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 m-auto w-[min(900px,94vw)] max-w-none overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <div>
          <h3 id={titleId} className="font-semibold">
            {title}
          </h3>
          <p className="text-xs text-gray-500">
            Vista del servidor · datos de ejemplo
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          autoFocus
          className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
        >
          Cerrar
        </button>
      </div>
      {html ? (
        <iframe
          title={`Correo ${title}`}
          sandbox=""
          srcDoc={html}
          className="h-[72vh] w-full border-0 bg-slate-100"
        />
      ) : (
        status
      )}
    </dialog>
  );
}
