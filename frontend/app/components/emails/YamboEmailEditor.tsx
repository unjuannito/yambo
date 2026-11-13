import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { EmailEditorProps } from "mailcanvas";
import "mailcanvas/style.css";
import { useAuth } from "~/hooks/useAuth";
import { emailCommonElementService, type EmailCommonElementView } from "~/services/emailCommonElementService";
import { prepareEditorHtml, toCommonElements } from "./emailEditorAdapter";

const EmailEditor = lazy(() => import("mailcanvas").then((module) => ({ default: module.EmailEditor })));
type Props = Omit<EmailEditorProps, "commonElements"> & { campaign?: boolean; excludeComponentKey?: string };

/** Browser-only editor: avoid loading the canvas/Monaco during SSR or list browsing. */
export function YamboEmailEditor({ campaign = false, excludeComponentKey, style, defaultMaximized = true, maximized: controlledMaximized, onMaximizedChange, onReset, onServerPreview, ...props }: Props) {
  const generatedValue = useRef<string | null>(null);
  const editorValue = useMemo(() => generatedValue.current === props.value ? props.value : prepareEditorHtml(props.value), [props.value]);
  const changeContent = (value: string) => { generatedValue.current = value; props.onChange(value); };
  const [maximized, setMaximized] = useState(defaultMaximized);
  const changeMaximized = (value: boolean) => { setMaximized(value); onMaximizedChange?.(value); };
  const outsideEditor = (action: () => void) => () => { changeMaximized(false); action(); };
  const [mounted, setMounted] = useState(false);
  const [elements, setElements] = useState<EmailCommonElementView[]>([]);
  const [commonLoading, setCommonLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { hasPermission, loading } = useAuth();
  const canReadCommon = !loading && hasPermission({ obj: "email_common", action: "read" });
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    let active = true;
    setElements([]);
    setFailed(false);
    setCommonLoading(false);
    if (canReadCommon) {
      setCommonLoading(true);
      emailCommonElementService.list().then((items) => {
        if (active) setElements(items);
      }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setCommonLoading(false); });
    }
    return () => { active = false; };
  }, [canReadCommon, attempt]);
  const fullDocument = /data-yambo-email-document=["']v1["']/.test(props.value);
  const commonElements = useMemo(() => ({
    ...toCommonElements(elements.filter((element) => element.key !== excludeComponentKey), campaign),
    ...(fullDocument ? { showEnvelopeHeader: false, headerHtml: "", footerHtml: "" } : {}),
  }), [elements, campaign, excludeComponentKey, fullDocument]);
  const fallback = <div role="status" className="grid min-h-64 place-items-center rounded-xl bg-gray-50 text-sm text-gray-500">Cargando editor de correo…</div>;
  return <div className="min-w-0">
    {mounted ? <Suspense fallback={fallback}>
      <EmailEditor {...props} value={editorValue} onChange={changeContent} templateKey={fullDocument ? "" : props.templateKey} maximized={controlledMaximized ?? maximized} onMaximizedChange={changeMaximized}
        onReset={onReset ? outsideEditor(onReset) : undefined}
        onServerPreview={onServerPreview ? outsideEditor(onServerPreview) : undefined}
        navigation={<>{props.navigation}{commonLoading && <span role="status">Cargando componentes…</span>}{failed && <span role="status">No se han podido cargar los componentes. <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></span>}{!canReadCommon && !loading && <span>No tienes permiso para consultar los componentes comunes.</span>}</>}
        commonElements={commonElements}
        style={{ height: "clamp(560px, 76dvh, 960px)", minHeight: 0, ...style }} />
    </Suspense> : fallback}
  </div>;
}
