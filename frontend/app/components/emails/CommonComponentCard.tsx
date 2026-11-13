import { useCallback } from "react";
import type { EmailCommonElementView } from "~/services/emailCommonElementService";
import { TemplatePreviewCard } from "./TemplatePreviewCard";
import { COMPONENT_TOKENS } from "./componentSamples";
import { normalizeTemplateMarkup } from "./emailEditorAdapter";
export function CommonComponentCard({ element, canEdit, onEdit }: { element: EmailCommonElementView; canEdit: boolean; onEdit: () => void }) {
  const preview = useCallback(async () => {
    const { renderEmail } = await import("mailcanvas");
    return { html: renderEmail(normalizeTemplateMarkup(element.html), COMPONENT_TOKENS, "", { showEnvelopeHeader: false, headerHtml: "", footerHtml: "" }).html };
  }, [element.html]);
  return <TemplatePreviewCard template={{ key: element.key, displayName: element.name, description: element.description ?? "Bloque reutilizable para tus correos", tokens: [], primaryLinkToken: null, overridden: false, subject: null, body: element.html }} canEdit={canEdit} onEdit={onEdit} loadPreview={preview} categoryLabel="Componente compartido" statusLabel={element.builtIn ? "Integrado" : "Reutilizable"} />;
}
