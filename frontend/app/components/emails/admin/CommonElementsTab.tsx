import type * as React from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import type { EmailCommonElementView } from "~/services/emailCommonElementService";
import { CommonComponentCard } from "../CommonComponentCard";
import { ComponentComposer } from "../ComponentComposer";
import { COMPONENT_TOKENS } from "../componentSamples";
import { PreviewFrame } from "../PreviewFrame";
import { YamboEmailEditor } from "../YamboEmailEditor";

interface CommonElementsTabProps {
  elements: EmailCommonElementView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  editingKey: string | "new" | null;
  form: { name: string; html: string; description: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; html: string; description: string }>
  >;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  saving: boolean;
  confirmReset: boolean;
  setConfirmReset: (v: boolean) => void;
  deleteTarget: EmailCommonElementView | null;
  onNew: () => void;
  onEdit: (el: EmailCommonElementView) => void;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onDeleteOpen: (el: EmailCommonElementView) => void;
  onDeleteConfirm: () => void;
  onDeleteClose: () => void;
}

export function CommonElementsTab(p: CommonElementsTabProps) {
  const { t } = useTranslation();

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

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t("emails.commonIntro")}</p>

      {p.canCreate && !p.editingKey && (
        <div className="flex justify-end">
          <ButtonComponent onClick={p.onNew} variant="primary">
            {t("emails.newCommonElement")}
          </ButtonComponent>
        </div>
      )}

      {p.editingKey !== "new" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {p.elements.map((el) => {
            const isEditing = p.editingKey === el.key;
            if (!isEditing)
              return (
                <CommonComponentCard
                  key={el.key}
                  element={el}
                  canEdit={p.canUpdate}
                  onEdit={() => p.onEdit(el)}
                />
              );
            return (
              <div
                key={el.key}
                className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-yambo-black flex items-center gap-2">
                      {el.name}
                      {el.builtIn && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {t("emails.commonBuiltIn")}
                        </span>
                      )}
                    </h2>
                    {el.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {el.description}
                      </p>
                    )}
                  </div>
                  {!isEditing && p.canUpdate && (
                    <ButtonComponent
                      onClick={() => p.onEdit(el)}
                      variant="primary"
                      size="sm"
                    >
                      {t("common.edit")}
                    </ButtonComponent>
                  )}
                </div>

                {!isEditing && (
                  <PreviewFrame
                    html={el.html}
                    label={t("emails.previewLabel")}
                  />
                )}

                {isEditing && (
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("emails.commonContent")}
                      </label>
                      <YamboEmailEditor
                        tokens={COMPONENT_TOKENS}
                        value={p.form.html}
                        onChange={(v) => p.setForm((f) => ({ ...f, html: v }))}
                        defaultMaximized={false}
                        title={el.name}
                        excludeComponentKey={el.key}
                        onSave={p.saving ? undefined : p.onSave}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ButtonComponent
                        onClick={p.onSave}
                        variant="primary"
                        isLoading={p.saving}
                      >
                        {t("emails.save")}
                      </ButtonComponent>
                      {el.builtIn && (
                        <ButtonComponent
                          onClick={() => p.setConfirmReset(true)}
                          variant="danger-text"
                          disabled={p.saving}
                        >
                          {t("emails.reset")}
                        </ButtonComponent>
                      )}
                      {!el.builtIn && p.canDelete && (
                        <ButtonComponent
                          onClick={() => p.onDeleteOpen(el)}
                          variant="danger-text"
                          disabled={p.saving}
                        >
                          {t("emails.delete")}
                        </ButtonComponent>
                      )}
                      <ButtonComponent
                        onClick={p.onClose}
                        variant="secondary"
                        disabled={p.saving}
                      >
                        {t("common.cancel")}
                      </ButtonComponent>
                    </div>

                    <ConfirmDialog
                      isOpen={p.confirmReset}
                      onClose={() => p.setConfirmReset(false)}
                      onConfirm={p.onReset}
                      title={t("emails.resetTitle")}
                      message={t("emails.resetMsg", { name: el.name })}
                      confirmLabel={t("emails.reset")}
                      variant="warning"
                      isLoading={p.saving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {p.editingKey === "new" && (
        <ComponentComposer
          form={p.form}
          setForm={p.setForm}
          saving={p.saving}
          onSave={p.onSave}
          onClose={p.onClose}
        />
      )}

      {/* Diálogo de borrado */}
      <ConfirmDialog
        isOpen={!!p.deleteTarget}
        onClose={p.onDeleteClose}
        onConfirm={p.onDeleteConfirm}
        title={t("emails.commonDeleteTitle")}
        message={t("emails.commonDeleteMsg", {
          name: p.deleteTarget?.name ?? "",
        })}
        confirmLabel={t("emails.delete")}
        variant="danger"
        isLoading={p.saving}
      />
    </div>
  );
}
