import type * as React from "react";
import { useRef } from "react";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import {
  type CampaignAudienceType,
  type CampaignRecipientSummary,
} from "~/services/campaignService";
import type { Profile } from "~/services/profileService";
import type { Project, ProjectGroup } from "~/services/projectService";
import type { User } from "~/types/userType";
import { PreviewFrame } from "../PreviewFrame";
import { useCampaignVariables } from "../useCampaignVariables";
import { YamboEmailEditor } from "../YamboEmailEditor";
import type { CampaignForm } from "./emailAdminTypes";
import { AUDIENCE_TYPES, selectClass } from "./emailAdminTypes";

interface CampaignEditorProps {
  form: CampaignForm;
  setForm: React.Dispatch<React.SetStateAction<CampaignForm>>;
  projects: Project[];
  profiles: Profile[];
  groups: ProjectGroup[];
  users: User[];
  saving: boolean;
  preview: string | null;
  previewing: boolean;
  recipients: CampaignRecipientSummary | null;
  onSave: () => void;
  onClose: () => void;
  onPreview: () => void;
  onToggleUser: (id: string) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export function CampaignEditor(p: CampaignEditorProps) {
  const tokens = useCampaignVariables();
  const { t } = p;
  const subjectInput = useRef<HTMLInputElement>(null);
  const insertSubjectVariable = (name: string) => {
    const field = subjectInput.current;
    const start = field?.selectionStart ?? p.form.subject.length;
    const end = field?.selectionEnd ?? start;
    const marker = "${" + name + "}";
    p.setForm((value) => ({
      ...value,
      subject:
        value.subject.slice(0, start) + marker + value.subject.slice(end),
    }));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + marker.length, start + marker.length);
    });
  };
  const f = p.form;
  const set = p.setForm;

  return (
    <div className="p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("emails.subject")}
          </label>
          <InputComponent
            ref={subjectInput}
            aria-label="Asunto del comunicado"
            value={f.subject}
            onChange={(e) => set((s) => ({ ...s, subject: e.target.value }))}
            placeholder={t("emails.subjectPlaceholder")}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>Insertar en el asunto:</span>
            {[
              ["nombre", "Nombre"],
              ["email", "Email"],
              ["fecha", "Fecha"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-label={`Insertar ${key} en asunto`}
                onClick={() => insertSubjectVariable(key)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 font-mono hover:border-yambo-green-400"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("emails.audience")}
          </label>
          <select
            className={selectClass}
            value={f.audienceType}
            onChange={(e) =>
              set((s) => ({
                ...s,
                audienceType: e.target.value as CampaignAudienceType,
                audienceRef: "",
                audienceUsers: [],
              }))
            }
          >
            {AUDIENCE_TYPES.map((a) => (
              <option key={a} value={a}>
                {t(`emails.audience${a}`)}
              </option>
            ))}
          </select>
        </div>

        {f.audienceType === "PROFILE" && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("emails.selectProfile")}
            </label>
            <select
              className={selectClass}
              value={f.audienceRef}
              onChange={(e) =>
                set((s) => ({ ...s, audienceRef: e.target.value }))
              }
            >
              <option value="">{t("emails.selectProfile")}</option>
              {p.profiles.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {f.audienceType === "PROJECT" && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("emails.selectProject")}
            </label>
            <select
              className={selectClass}
              value={f.audienceRef}
              onChange={(e) =>
                set((s) => ({ ...s, audienceRef: e.target.value }))
              }
            >
              <option value="">{t("emails.selectProject")}</option>
              {p.projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {f.audienceType === "GROUP" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("emails.selectProject")}
              </label>
              <select
                className={selectClass}
                value={f.audienceRef}
                onChange={(e) =>
                  set((s) => ({
                    ...s,
                    audienceRef: e.target.value,
                    audienceUsers: [],
                  }))
                }
              >
                <option value="">{t("emails.selectProjectFirst")}</option>
                {p.projects.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("emails.selectGroup")}
              </label>
              <select
                className={selectClass}
                value={
                  f.audienceRef === ""
                    ? ""
                    : f.audienceRef && !p.groups.length
                      ? "loading"
                      : "pickgroup"
                }
                disabled={!f.audienceRef}
                onChange={(e) => {
                  const g = p.groups.find((x) => x.id === e.target.value);
                  if (g) set((s) => ({ ...s, audienceRef: g.id }));
                }}
              >
                <option value="">{t("emails.selectGroup")}</option>
                {p.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.id}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {f.audienceType === "USERS" && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("emails.usersList")}
            </label>
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-2xl p-3 space-y-1 bg-white">
              {p.users.length === 0 && (
                <p className="text-xs text-gray-400">{t("emails.noUsers")}</p>
              )}
              {p.users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={f.audienceUsers.includes(u.id)}
                    onChange={() => p.onToggleUser(u.id)}
                    className="rounded border-gray-300 text-yambo-green-600"
                  />
                  <span>{u.name}</span>
                  {u.email && (
                    <span className="text-gray-400 text-xs">({u.email})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("emails.body")}
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Nombre, usuario y email se sustituyen por los de cada destinatario
            al enviar. La vista previa usa un socio ficticio; la del servidor
            muestra la última versión guardada.
          </p>
          <YamboEmailEditor
            value={f.body}
            onChange={(v) => set((s) => ({ ...s, body: v }))}
            tokens={tokens}
            title={t("emails.body")}
            campaign
            onServerPreview={p.previewing ? undefined : p.onPreview}
            onSave={p.saving ? undefined : p.onSave}
          />
        </div>
      </div>

      {p.recipients && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700">
            {t("emails.recipientCount", { count: p.recipients.count })}
          </p>
          {p.recipients.names.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {p.recipients.names.slice(0, 10).join(", ")}
              {p.recipients.names.length > 10 ? "…" : ""}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ButtonComponent
          onClick={p.onSave}
          variant="primary"
          isLoading={p.saving}
        >
          {t("emails.save")}
        </ButtonComponent>
        <ButtonComponent
          onClick={p.onPreview}
          variant="neutral"
          isLoading={p.previewing}
        >
          {t("emails.preview")}
        </ButtonComponent>
        <ButtonComponent
          onClick={p.onClose}
          variant="secondary"
          disabled={p.saving}
        >
          {t("common.cancel")}
        </ButtonComponent>
      </div>

      {p.preview && (
        <PreviewFrame html={p.preview} label={t("emails.previewLabel")} />
      )}
    </div>
  );
}
