import {
  CAMPAIGN_STARTERS,
  starterPreview,
  type CampaignStarter,
} from "../campaignStarters";
import type * as React from "react";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import {
  type CampaignRecipientSummary,
  type CampaignView,
} from "~/services/campaignService";
import type { Profile } from "~/services/profileService";
import type { Project, ProjectGroup } from "~/services/projectService";
import type { User } from "~/types/userType";
import { CampaignEditor } from "./CampaignEditor";
import type { CampaignForm } from "./emailAdminTypes";
import { formatDateTime } from "./emailAdminTypes";

interface CampaignsTabProps {
  campaigns: CampaignView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  editingId: string | "new" | null;
  campForm: CampaignForm;
  setCampForm: React.Dispatch<React.SetStateAction<CampaignForm>>;
  projects: Project[];
  profiles: Profile[];
  groups: ProjectGroup[];
  users: User[];
  canCreate: boolean;
  canUpdate: boolean;
  canSend: boolean;
  canDelete: boolean;
  savingCamp: boolean;
  campPreview: string | null;
  previewingCamp: boolean;
  recipients: CampaignRecipientSummary | null;
  sendTarget: CampaignView | null;
  deleteTarget: CampaignView | null;
  busyDialog: boolean;
  onNew: (starter?: CampaignStarter) => void;
  onEdit: (c: CampaignView) => void;
  onClose: () => void;
  onSave: () => void;
  onPreview: (id?: string) => void;
  onSendOpen: (c: CampaignView) => void;
  onSendConfirm: () => void;
  onSendClose: () => void;
  onDeleteOpen: (c: CampaignView) => void;
  onDeleteConfirm: () => void;
  onDeleteClose: () => void;
  onToggleUser: (id: string) => void;
  audienceLabel: (c: CampaignView) => string;
  statusBadge: (c: CampaignView) => React.ReactNode;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export function CampaignsTab(p: CampaignsTabProps) {
  const { t } = p;
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
      {p.canCreate && (
        <div className="flex justify-end">
          <ButtonComponent onClick={() => p.onNew()} variant="primary">
            {t("emails.newCampaign")}
          </ButtonComponent>
        </div>
      )}

      {p.canCreate && !p.editingId && (
        <section aria-label="Plantillas de comunicado" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Empieza con una plantilla de Yambo
            </h2>
            <p className="text-sm text-gray-500">
              Elige un diseño, completa sus detalles y guarda un borrador. No se
              envía automáticamente.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CAMPAIGN_STARTERS.map((starter) => (
              <article
                key={starter.key}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                <div
                  className="h-44 overflow-hidden border-b bg-gray-50"
                  aria-hidden="true"
                >
                  <iframe
                    tabIndex={-1}
                    title={`Diseño de ${starter.name}`}
                    sandbox=""
                    srcDoc={starterPreview(starter)}
                    style={{
                      width: "600px",
                      height: "420px",
                      transform: "scale(.45)",
                      transformOrigin: "top left",
                      pointerEvents: "none",
                      border: 0,
                    }}
                  />
                </div>
                <div className="space-y-3 p-4">
                  <h3 className="font-semibold">{starter.name}</h3>
                  <p className="text-sm text-gray-500">{starter.description}</p>
                  <ButtonComponent
                    variant="secondary"
                    onClick={() => p.onNew(starter)}
                  >
                    Usar {starter.name.toLocaleLowerCase()}
                  </ButtonComponent>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {p.campaigns.length === 0 && !p.editingId && (
        <p className="text-gray-500">{t("emails.noCampaigns")}</p>
      )}

      <div className="space-y-4">
        {p.campaigns.map((c) => {
          const isEditing = p.editingId === c.id;
          const isSent = c.status === "SENT";
          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-yambo-black flex items-center gap-2">
                    {c.subject || t("emails.untitled")} {p.statusBadge(c)}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {p.audienceLabel(c)} ·{" "}
                    {t("emails.recipientCount", { count: c.recipientCount })}
                    {c.sentAt
                      ? ` · ${t("emails.sentAt")}: ${formatDateTime(c.sentAt)}`
                      : ""}
                    {!c.sentAt
                      ? ` · ${t("emails.createdAt")}: ${formatDateTime(c.createdAt)}`
                      : ""}
                  </p>
                </div>
                {!isEditing && (
                  <div className="flex gap-2">
                    {p.canUpdate && !isSent && (
                      <ButtonComponent
                        onClick={() => p.onEdit(c)}
                        variant="primary"
                        size="sm"
                      >
                        {t("common.edit")}
                      </ButtonComponent>
                    )}
                    {p.canSend && !isSent && (
                      <ButtonComponent
                        onClick={() => p.onSendOpen(c)}
                        variant="success"
                        size="sm"
                      >
                        {t("emails.send")}
                      </ButtonComponent>
                    )}
                    {p.canDelete && !isSent && (
                      <ButtonComponent
                        onClick={() => p.onDeleteOpen(c)}
                        variant="danger-text"
                        size="sm"
                      >
                        {t("emails.delete")}
                      </ButtonComponent>
                    )}
                    {isSent && !p.canUpdate && <span />}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="p-6">
                  <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                    {c.body || "—"}
                  </p>
                </div>
              )}

              {isEditing && (
                <CampaignEditor
                  form={p.campForm}
                  setForm={p.setCampForm}
                  projects={p.projects}
                  profiles={p.profiles}
                  groups={p.groups}
                  users={p.users}
                  saving={p.savingCamp}
                  preview={p.campPreview}
                  previewing={p.previewingCamp}
                  recipients={p.recipients}
                  onSave={p.onSave}
                  onClose={p.onClose}
                  onPreview={() => p.onPreview(c.id)}
                  onToggleUser={p.onToggleUser}
                  t={t}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor de nuevo comunicado */}
      {p.editingId === "new" && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-yambo-green-300 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <h2 className="font-semibold text-yambo-black">
              {t("emails.newCampaign")}
            </h2>
          </div>
          <CampaignEditor
            form={p.campForm}
            setForm={p.setCampForm}
            projects={p.projects}
            profiles={p.profiles}
            groups={p.groups}
            users={p.users}
            saving={p.savingCamp}
            preview={p.campPreview}
            previewing={p.previewingCamp}
            recipients={p.recipients}
            onSave={p.onSave}
            onClose={p.onClose}
            onPreview={() => p.onPreview()}
            onToggleUser={p.onToggleUser}
            t={t}
          />
        </div>
      )}

      {/* Diálogo de envío */}
      <ConfirmDialog
        isOpen={!!p.sendTarget}
        onClose={p.onSendClose}
        onConfirm={p.onSendConfirm}
        title={t("emails.sendTitle")}
        message={
          p.recipients
            ? t("emails.sendMsg", {
                subject: p.sendTarget?.subject ?? "",
                count: p.recipients.count,
              })
            : t("emails.loading")
        }
        confirmLabel={t("emails.send")}
        variant="warning"
        isLoading={p.busyDialog}
      />

      {/* Diálogo de borrado */}
      <ConfirmDialog
        isOpen={!!p.deleteTarget}
        onClose={p.onDeleteClose}
        onConfirm={p.onDeleteConfirm}
        title={t("emails.deleteTitle")}
        message={t("emails.deleteMsg", {
          subject: p.deleteTarget?.subject ?? "",
        })}
        confirmLabel={t("emails.delete")}
        variant="danger"
        isLoading={p.busyDialog}
      />
    </div>
  );
}
