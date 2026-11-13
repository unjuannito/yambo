import type * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import type { EmailTemplateView } from "~/services/emailTemplateService";
import { toEmailTokens } from "../emailEditorAdapter";
import { PreviewFrame } from "../PreviewFrame";
import { TemplatePreviewCard, templateCategory } from "../TemplatePreviewCard";
import { YamboEmailEditor } from "../YamboEmailEditor";

interface TemplatesTabProps {
  templates: EmailTemplateView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  editingKey: string | null;
  tplForm: { subject: string; body: string };
  setTplForm: React.Dispatch<
    React.SetStateAction<{ subject: string; body: string }>
  >;
  canUpdateTpl: boolean;
  savingTpl: boolean;
  tplPreview: string | null;
  previewingTpl: boolean;
  testEmail: string;
  setTestEmail: (v: string) => void;
  sendingTest: boolean;
  confirmReset: boolean;
  setConfirmReset: (v: boolean) => void;
  onEdit: (tpl: EmailTemplateView) => void;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onPreview: () => void;
  onTest: () => void;
}

export function TemplatesTab(p: TemplatesTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const visibleTemplates = p.templates.filter(
    (template) =>
      template.key === p.editingKey ||
      ((category === "Todas" || templateCategory(template.key) === category) &&
        `${template.displayName} ${template.description}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  if (p.loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message={t("emails.loading")} />
      </div>
    );
  }
  if (p.error) {
    return <ErrorMessage message={p.error} onRetry={p.onRetry} />;
  }
  if (p.templates.length === 0) {
    return <p className="text-gray-500">{t("emails.noTemplates")}</p>;
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-yambo-black">
            Tus plantillas de correo
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Reconoce cada correo por su diseño y abre el que quieras editar.
          </p>
        </div>
        <input
          aria-label="Buscar plantillas"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar una plantilla…"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm sm:w-72 focus:outline-none focus:ring-2 focus:ring-yambo-green-400"
        />
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filtrar plantillas por categoría"
      >
        {[
          "Todas",
          "Pedidos",
          "Incidencias",
          "Acceso y cuentas",
          "Actividades",
        ].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
            className={`rounded-full px-3.5 py-2 text-sm font-medium ${category === value ? "bg-yambo-green-600 text-white" : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"}`}
          >
            {value}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400" aria-live="polite">
          {visibleTemplates.length} plantillas
        </span>
      </div>
      {visibleTemplates.length === 0 && (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">
          No hay plantillas que coincidan. Prueba otro nombre o categoría.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleTemplates.map((tpl) => {
          const isEditing = p.editingKey === tpl.key;
          if (!isEditing)
            return (
              <TemplatePreviewCard
                key={tpl.key}
                template={tpl}
                canEdit={p.canUpdateTpl}
                onEdit={() => p.onEdit(tpl)}
              />
            );
          return (
            <div
              key={tpl.key}
              className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-yambo-black flex items-center gap-2">
                    {tpl.displayName}
                    {tpl.overridden ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yambo-green-100 text-yambo-green-700">
                        {t("emails.overridden")}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {t("emails.default")}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {tpl.description}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    {tpl.tokens.length} variables disponibles en el editor
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("emails.subject")}
                      </label>
                      <InputComponent
                        value={p.tplForm.subject}
                        onChange={(e) =>
                          p.setTplForm((f) => ({
                            ...f,
                            subject: e.target.value,
                          }))
                        }
                        placeholder={t("emails.subjectPlaceholder")}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("emails.body")}
                      </label>
                      <YamboEmailEditor
                        key={tpl.key}
                        templateKey={tpl.key}
                        value={p.tplForm.body}
                        onChange={(v) =>
                          p.setTplForm((f) => ({ ...f, body: v }))
                        }
                        tokens={toEmailTokens(tpl.tokens)}
                        title={tpl.displayName}
                        onServerPreview={
                          p.previewingTpl ? undefined : p.onPreview
                        }
                        onSave={p.savingTpl ? undefined : p.onSave}
                        onReset={
                          tpl.overridden && !p.savingTpl
                            ? () => p.setConfirmReset(true)
                            : undefined
                        }
                        onSendTest={
                          !p.sendingTest && p.testEmail.trim()
                            ? p.onTest
                            : undefined
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("emails.testEmail")}
                      </label>
                      <InputComponent
                        type="email"
                        value={p.testEmail}
                        onChange={(e) => p.setTestEmail(e.target.value)}
                        placeholder="nombre@correo.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ButtonComponent
                      onClick={p.onSave}
                      variant="primary"
                      isLoading={p.savingTpl}
                    >
                      {t("emails.save")}
                    </ButtonComponent>
                    <ButtonComponent
                      onClick={p.onPreview}
                      variant="neutral"
                      isLoading={p.previewingTpl}
                    >
                      {t("emails.preview")}
                    </ButtonComponent>
                    <ButtonComponent
                      onClick={p.onTest}
                      variant="neutral"
                      isLoading={p.sendingTest}
                    >
                      {t("emails.sendTest")}
                    </ButtonComponent>
                    {tpl.overridden && (
                      <ButtonComponent
                        onClick={() => p.setConfirmReset(true)}
                        variant="danger-text"
                        disabled={p.savingTpl}
                      >
                        {t("emails.reset")}
                      </ButtonComponent>
                    )}
                    <ButtonComponent
                      onClick={p.onClose}
                      variant="secondary"
                      disabled={p.savingTpl}
                    >
                      {t("common.cancel")}
                    </ButtonComponent>
                  </div>

                  {p.tplPreview && (
                    <PreviewFrame
                      html={p.tplPreview}
                      label={t("emails.previewLabel")}
                    />
                  )}

                  <ConfirmDialog
                    isOpen={p.confirmReset}
                    onClose={() => p.setConfirmReset(false)}
                    onConfirm={p.onReset}
                    title={t("emails.resetTitle")}
                    message={t("emails.resetMsg", { name: tpl.displayName })}
                    confirmLabel={t("emails.reset")}
                    variant="warning"
                    isLoading={p.savingTpl}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
