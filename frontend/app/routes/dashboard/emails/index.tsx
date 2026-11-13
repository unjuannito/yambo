import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons";
import { PageHeader } from "~/components/common/PageHeader";
import { PageContainer } from "~/components/common/PageContainer";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { ComponentComposer } from "~/components/emails/ComponentComposer";
import { CommonComponentCard } from "~/components/emails/CommonComponentCard";
import { COMPONENT_TOKENS } from "~/components/emails/componentSamples";
import { TemplatePreviewCard, templateCategory } from "~/components/emails/TemplatePreviewCard";
import { CAMPAIGN_TOKENS } from "~/components/emails/campaignVariables";
import { YamboEmailEditor } from "~/components/emails/YamboEmailEditor";
import { emailCommonElementService, type EmailCommonElementView } from "~/services/emailCommonElementService";
import { toEmailTokens } from "~/components/emails/emailEditorAdapter";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { useAuth } from "~/hooks/useAuth";
import {
  emailTemplateService,
  type EmailTemplateView,
} from "~/services/emailTemplateService";
import {
  campaignService,
  type CampaignAudienceType,
  type CampaignView,
  type CampaignRecipientSummary,
} from "~/services/campaignService";
import {
  projectService,
  type Project,
  type ProjectGroup,
} from "~/services/projectService";
import { profileService, type Profile } from "~/services/profileService";
import { adminUserService } from "~/services/adminUserService";
import type { User } from "~/types/userType";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

type Tab = "templates" | "campaigns" | "common";

const AUDIENCE_TYPES: CampaignAudienceType[] = [
  "ALL",
  "PROFILE",
  "PROJECT",
  "GROUP",
  "USERS",
];

const selectClass =
  "w-full border border-gray-200 rounded-2xl text-sm px-4 py-2.5 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-yambo-green-300 " +
  "focus:border-yambo-green-400 shadow-sm";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PreviewFrame({ html, label }: { html: string | null; label: string }) {
  if (!html) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <iframe
        title={label}
        sandbox=""
        srcDoc={html}
        className="w-full h-96 rounded-xl border border-gray-200 bg-white"
      />
    </div>
  );
}

interface CampaignForm {
  subject: string;
  body: string;
  audienceType: CampaignAudienceType;
  audienceRef: string;
  audienceUsers: string[];
}

const emptyCampaign: CampaignForm = {
  subject: "",
  body: "",
  audienceType: "ALL",
  audienceRef: "",
  audienceUsers: [],
};

export default function EmailsAdmin() {
  const { t } = useTranslation();
  const { hasPermission, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("templates");

  // ── Permisos ──────────────────────────────────────────────────────────
  const canRead = hasPermission(
    [
      { obj: "email_template", action: "read" },
      { obj: "campaign", action: "read" },
      { obj: "email_common", action: "read" },
    ],
    false,
  );
  const canReadTpl = hasPermission({ obj: "email_template", action: "read" });
  const canReadCamp = hasPermission({ obj: "campaign", action: "read" });
  const canUpdateTpl = hasPermission({ obj: "email_template", action: "update" });
  const canCreateCamp = hasPermission({ obj: "campaign", action: "create" });
  const canUpdateCamp = hasPermission({ obj: "campaign", action: "update" });
  const canSendCamp = hasPermission({ obj: "campaign", action: "send" });
  const canDeleteCamp = hasPermission({ obj: "campaign", action: "delete" });
  const canReadCommon = hasPermission({ obj: "email_common", action: "read" });
  const canCreateCommon = hasPermission({ obj: "email_common", action: "create" });
  const canUpdateCommon = hasPermission({ obj: "email_common", action: "update" });
  const canDeleteCommon = hasPermission({ obj: "email_common", action: "delete" });

  // ── Plantillas ────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplateView[]>([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplRefresh, setTplRefresh] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState({ subject: "", body: "" });
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplPreview, setTplPreview] = useState<string | null>(null);
  const [previewingTpl, setPreviewingTpl] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (authLoading || !canReadTpl) { setTplLoading(false); return; }
    try {
      setTplLoading(true);
      setTplError(null);
      setTemplates(await emailTemplateService.list());
    } catch (err) {
      setTplError(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setTplLoading(false);
    }
  }, [tplRefresh, t, authLoading, canReadTpl]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const startEditTpl = async (tpl: EmailTemplateView) => {
    setEditingKey(tpl.key);
    setTplForm({ subject: tpl.subject ?? "", body: tpl.body ?? "" });
    setTestEmail("");
    setTplPreview(null);
    try {
      setPreviewingTpl(true);
      const res = await emailTemplateService.preview(tpl.key, tpl.body);
      setTplPreview(res.html);
    } catch {
      setTplPreview(null);
    } finally {
      setPreviewingTpl(false);
    }
  };

  const closeTpl = () => {
    setEditingKey(null);
    setTplForm({ subject: "", body: "" });
    setTplPreview(null);
    setConfirmReset(false);
  };

  const handleSaveTpl = async () => {
    if (!editingKey) return;
    try {
      setSavingTpl(true);
      await emailTemplateService.save(editingKey, {
        subject: tplForm.subject || null,
        body: tplForm.body || null,
      });
      toast.success(t("emails.saved"));
      closeTpl();
      setTplRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingTpl(false);
    }
  };

  const handleResetTpl = async () => {
    if (!editingKey) return;
    try {
      setSavingTpl(true);
      await emailTemplateService.reset(editingKey);
      toast.success(t("emails.saved"));
      setConfirmReset(false);
      closeTpl();
      setTplRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingTpl(false);
    }
  };

  const handlePreviewTpl = async () => {
    if (!editingKey) return;
    try {
      setPreviewingTpl(true);
      const res = await emailTemplateService.preview(editingKey, tplForm.body);
      setTplPreview(res.html);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setPreviewingTpl(false);
    }
  };

  const handleSendTest = async () => {
    if (!editingKey) return;
    const to = testEmail.trim();
    if (!to) {
      toast.error(t("emails.testEmailRequired"));
      return;
    }
    try {
      setSendingTest(true);
      await emailTemplateService.sendTest(editingKey, {
        to,
        subject: tplForm.subject || undefined,
        body: tplForm.body || undefined,
      });
      toast.success(t("emails.sendTestSuccess", { to }));
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setSendingTest(false);
    }
  };

  // ── Comunicados ───────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [campLoading, setCampLoading] = useState(true);
  const [campError, setCampError] = useState<string | null>(null);
  const [campRefresh, setCampRefresh] = useState(0);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const campaignEditRequest = useRef(0);
  const [campForm, setCampForm] = useState<CampaignForm>(emptyCampaign);
  const [savingCamp, setSavingCamp] = useState(false);
  const [campPreview, setCampPreview] = useState<string | null>(null);
  const [previewingCamp, setPreviewingCamp] = useState(false);
  const [recipients, setRecipients] = useState<CampaignRecipientSummary | null>(null);
  const [sendTarget, setSendTarget] = useState<CampaignView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignView | null>(null);
  const [busyDialog, setBusyDialog] = useState(false);

  // Opciones de audiencia
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchCampaigns = useCallback(async () => {
    if (authLoading || !canReadCamp) { setCampLoading(false); return; }
    try {
      setCampLoading(true);
      setCampError(null);
      setCampaigns(await campaignService.list());
    } catch (err) {
      setCampError(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setCampLoading(false);
    }
  }, [campRefresh, t, authLoading, canReadCamp]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Carga las opciones de audiencia cuando se abre el editor (o al montar la pestaña).
  useEffect(() => {
    if (tab !== "campaigns") return;
    let active = true;
    (async () => {
      try {
        if (projects.length === 0) {
          const p = await projectService.listProjects(0, 200);
          if (active) setProjects(p.content);
        }
        if (profiles.length === 0) {
          const pr = await profileService.getAllProfiles();
          if (active) setProfiles(pr);
        }
      } catch {
        /* sin permisos o error: los selectores quedarán vacíos */
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, projects.length, profiles.length]);

  // Grupos del proyecto seleccionado.
  useEffect(() => {
    if (campForm.audienceType !== "GROUP" || !campForm.audienceRef) {
      setGroups([]);
      return;
    }
    let active = true;
    projectService
      .listGroups(campForm.audienceRef)
      .then((g) => active && setGroups(g))
      .catch(() => active && setGroups([]));
    return () => {
      active = false;
    };
  }, [campForm.audienceType, campForm.audienceRef]);

  // Usuarios para la audiencia explícita.
  useEffect(() => {
    if (campForm.audienceType !== "USERS") {
      setUsers([]);
      return;
    }
    let active = true;
    adminUserService
      .listUsers({ page: 0, size: 100, enabled: true })
      .then((r) => active && setUsers(r.content))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [campForm.audienceType]);

  const openNewCampaign = () => {
    campaignEditRequest.current++;
    setEditingId("new");
    setCampForm(emptyCampaign);
    setCampPreview(null);
    setRecipients(null);
  };

  const startEditCamp = async (campaign: CampaignView) => {
    const request = ++campaignEditRequest.current;
    try {
      // The list response may deliberately omit body: fetch the complete draft
      // before mounting the editor so editing cannot overwrite it with empty HTML.
      const full = await campaignService.getById(campaign.id);
      if (request !== campaignEditRequest.current) return;
      setEditingId(full.id);
      setCampForm({
        subject: full.subject,
        body: full.body ?? "",
        audienceType: full.audienceType,
        audienceRef: full.audienceRef ?? "",
        audienceUsers: full.audienceUsers ?? [],
      });
      setCampPreview(null);
      setRecipients(null);
    } catch (err) {
      if (request === campaignEditRequest.current) {
        toast.error(getErrorMessage(err, t("emails.loadError")));
      }
    }
  };

  const closeCamp = () => {
    campaignEditRequest.current++;
    setEditingId(null);
    setCampForm(emptyCampaign);
    setCampPreview(null);
    setRecipients(null);
  };

  const handleSaveCamp = async () => {
    if (!campForm.subject.trim()) {
      toast.error(t("emails.subjectRequired"));
      return;
    }
    try {
      setSavingCamp(true);
      const payload = {
        subject: campForm.subject,
        body: campForm.body || null,
        audienceType: campForm.audienceType,
        audienceRef:
          campForm.audienceType === "PROFILE" ||
          campForm.audienceType === "PROJECT" ||
          campForm.audienceType === "GROUP"
            ? campForm.audienceRef || null
            : null,
        audienceUsers:
          campForm.audienceType === "USERS" ? campForm.audienceUsers : null,
      };
      if (editingId === "new") {
        await campaignService.create(payload);
      } else if (editingId) {
        await campaignService.update(editingId, payload);
      }
      toast.success(t("emails.saved"));
      closeCamp();
      setCampRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingCamp(false);
    }
  };

  const handlePreviewCamp = async (id?: string) => {
    const target = id ?? editingId;
    if (!target || target === "new") {
      toast.error(t("emails.saveFirstToPreview"));
      return;
    }
    try {
      setPreviewingCamp(true);
      const res = await campaignService.previewHtml(target);
      setCampPreview(res.html);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setPreviewingCamp(false);
    }
  };

  const openSendDialog = async (c: CampaignView) => {
    setSendTarget(c);
    setRecipients(null);
    try {
      const r = await campaignService.previewRecipients(c.id);
      setRecipients(r);
    } catch {
      setRecipients({ count: 0, names: [], emails: [] });
    }
  };

  const handleSendConfirm = async () => {
    if (!sendTarget) return;
    try {
      setBusyDialog(true);
      const r = await campaignService.send(sendTarget.id);
      toast.success(
        t("emails.sent", { count: r?.count ?? recipients?.count ?? 0 }),
      );
      setSendTarget(null);
      setRecipients(null);
      setCampRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.sendError")));
    } finally {
      setBusyDialog(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setBusyDialog(true);
      await campaignService.deleteCampaign(deleteTarget.id);
      toast.success(t("emails.deleted"));
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) closeCamp();
      setCampRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setBusyDialog(false);
    }
  };

  const toggleUser = (id: string) => {
    setCampForm((f) => ({
      ...f,
      audienceUsers: f.audienceUsers.includes(id)
        ? f.audienceUsers.filter((u) => u !== id)
        : [...f.audienceUsers, id],
    }));
  };

  const audienceLabel = useMemo(() => {
    const profileName = (id: string | null) =>
      profiles.find((p) => p.id === id)?.name ?? id ?? "";
    const projectName = (id: string | null) =>
      projects.find((p) => p.id === id)?.name ?? id ?? "";
    return (c: CampaignView): string => {
      switch (c.audienceType) {
        case "ALL":
          return t("emails.audienceAll");
        case "PROFILE":
          return profileName(c.audienceRef) || t("emails.audienceProfile");
        case "PROJECT":
          return projectName(c.audienceRef) || t("emails.audienceProject");
        case "GROUP":
          return t("emails.audienceGroup");
        case "USERS":
          return `${t("emails.audienceUsers")} (${c.audienceUsers?.length ?? 0})`;
        default:
          return c.audienceType;
      }
    };
  }, [profiles, projects, t]);

  const statusBadge = (c: CampaignView) =>
    c.status === "SENT" ? (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        {t("emails.statusSent")}
      </span>
    ) : (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        {t("emails.statusDraft")}
      </span>
    );

  // ── Elementos comunes ────────────────────────────────────────────────
  const [commonElements, setCommonElements] = useState<EmailCommonElementView[]>([]);
  const [commonLoading, setCommonLoading] = useState(true);
  const [commonError, setCommonError] = useState<string | null>(null);
  const [commonRefresh, setCommonRefresh] = useState(0);
  const [editingCommonKey, setEditingCommonKey] = useState<string | "new" | null>(null);
  const [commonForm, setCommonForm] = useState({ name: "", html: "", description: "" });
  const [savingCommon, setSavingCommon] = useState(false);
  const [confirmResetCommon, setConfirmResetCommon] = useState(false);
  const [deleteCommonTarget, setDeleteCommonTarget] = useState<EmailCommonElementView | null>(null);

  const fetchCommonElements = useCallback(async () => {
    if (!canReadCommon) {
      setCommonLoading(false);
      return;
    }
    try {
      setCommonLoading(true);
      setCommonError(null);
      setCommonElements(await emailCommonElementService.list());
    } catch (err) {
      setCommonError(getErrorMessage(err, t("emails.loadError")));
    } finally {
      setCommonLoading(false);
    }
  }, [commonRefresh, canReadCommon, t]);

  useEffect(() => {
    fetchCommonElements();
  }, [fetchCommonElements]);

  const startEditCommon = (el: EmailCommonElementView) => {
    setEditingCommonKey(el.key);
    setCommonForm({ name: el.name, html: el.html, description: el.description ?? "" });
  };

  const openNewCommon = () => {
    setEditingCommonKey("new");
    setCommonForm({ name: "", html: "", description: "" });
  };

  const closeCommon = () => {
    setEditingCommonKey(null);
    setCommonForm({ name: "", html: "", description: "" });
    setConfirmResetCommon(false);
  };

  const handleSaveCommon = async () => {
    if (!editingCommonKey) return;
    try {
      setSavingCommon(true);
      if (editingCommonKey === "new") {
        await emailCommonElementService.create({
          name: commonForm.name,
          html: commonForm.html,
          description: commonForm.description || null,
        });
      } else {
        await emailCommonElementService.update(editingCommonKey, { html: commonForm.html });
      }
      toast.success(t("emails.saved"));
      closeCommon();
      setCommonRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingCommon(false);
    }
  };

  const handleResetCommon = async () => {
    if (!editingCommonKey || editingCommonKey === "new") return;
    try {
      setSavingCommon(true);
      const updated = await emailCommonElementService.reset(editingCommonKey);
      setCommonForm((f) => ({ ...f, html: updated.html }));
      toast.success(t("emails.saved"));
      setConfirmResetCommon(false);
      setCommonRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingCommon(false);
    }
  };

  const handleDeleteCommonConfirm = async () => {
    if (!deleteCommonTarget) return;
    try {
      setSavingCommon(true);
      await emailCommonElementService.remove(deleteCommonTarget.key);
      toast.success(t("emails.commonDeleted"));
      setDeleteCommonTarget(null);
      if (editingCommonKey === deleteCommonTarget.key) closeCommon();
      setCommonRefresh((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t("emails.saveError")));
    } finally {
      setSavingCommon(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const permitted = { templates: canReadTpl, campaigns: canReadCamp, common: canReadCommon };
    if (!permitted[tab]) setTab(canReadTpl ? "templates" : canReadCamp ? "campaigns" : "common");
  }, [authLoading, tab, canReadTpl, canReadCamp, canReadCommon]);

  // ── Render ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message={t("emails.loading")} />
        </div>
      </PageContainer>
    );
  }

  if (!canRead) {
    return (
      <PageContainer>
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-yambo-green-500" />
              {t("emails.pageTitle")}
            </span>
          }
        />
        <ErrorMessage message={t("component.requirePermission.restricted")} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-yambo-green-500" />
            {t("emails.pageTitle")}
          </span>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {([...(canReadTpl ? ["templates" as const] : []), ...(canReadCamp ? ["campaigns" as const] : []), ...(canReadCommon ? ["common" as const] : [])] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
              tab === tb
                ? "border-yambo-green-500 text-yambo-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tb === "templates" ? t("emails.tabTemplates") : tb === "campaigns" ? t("emails.tabCampaigns") : t("emails.tabCommon")}
          </button>
        ))}
      </div>

      {tab === "common" ? (
        <CommonElementsTab
          elements={commonElements}
          loading={commonLoading}
          error={commonError}
          onRetry={fetchCommonElements}
          editingKey={editingCommonKey}
          form={commonForm}
          setForm={setCommonForm}
          canCreate={canCreateCommon}
          canUpdate={canUpdateCommon}
          canDelete={canDeleteCommon}
          saving={savingCommon}
          confirmReset={confirmResetCommon}
          setConfirmReset={setConfirmResetCommon}
          deleteTarget={deleteCommonTarget}
          onNew={openNewCommon}
          onEdit={startEditCommon}
          onClose={closeCommon}
          onSave={handleSaveCommon}
          onReset={handleResetCommon}
          onDeleteOpen={(el) => setDeleteCommonTarget(el)}
          onDeleteConfirm={handleDeleteCommonConfirm}
          onDeleteClose={() => setDeleteCommonTarget(null)}
        />
      ) : tab === "templates" ? (
        <TemplatesTab
          templates={templates}
          loading={tplLoading}
          error={tplError}
          onRetry={fetchTemplates}
          editingKey={editingKey}
          tplForm={tplForm}
          setTplForm={setTplForm}
          canUpdateTpl={canUpdateTpl}
          savingTpl={savingTpl}
          tplPreview={tplPreview}
          previewingTpl={previewingTpl}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          sendingTest={sendingTest}
          confirmReset={confirmReset}
          setConfirmReset={setConfirmReset}
          onEdit={startEditTpl}
          onClose={closeTpl}
          onSave={handleSaveTpl}
          onReset={handleResetTpl}
          onPreview={handlePreviewTpl}
          onTest={handleSendTest}
        />
      ) : (
        <CampaignsTab
          campaigns={campaigns}
          loading={campLoading}
          error={campError}
          onRetry={fetchCampaigns}
          editingId={editingId}
          campForm={campForm}
          setCampForm={setCampForm}
          projects={projects}
          profiles={profiles}
          groups={groups}
          users={users}
          canCreate={canCreateCamp}
          canUpdate={canUpdateCamp}
          canSend={canSendCamp}
          canDelete={canDeleteCamp}
          savingCamp={savingCamp}
          campPreview={campPreview}
          previewingCamp={previewingCamp}
          recipients={recipients}
          sendTarget={sendTarget}
          deleteTarget={deleteTarget}
          busyDialog={busyDialog}
          onNew={openNewCampaign}
          onEdit={startEditCamp}
          onClose={closeCamp}
          onSave={handleSaveCamp}
          onPreview={handlePreviewCamp}
          onSendOpen={openSendDialog}
          onSendConfirm={handleSendConfirm}
          onSendClose={() => {
            setSendTarget(null);
            setRecipients(null);
          }}
          onDeleteOpen={(c) => setDeleteTarget(c)}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteClose={() => setDeleteTarget(null)}
          onToggleUser={toggleUser}
          audienceLabel={audienceLabel}
          statusBadge={statusBadge}
          t={t}
        />
      )}
    </PageContainer>
  );
}

// ── Pestaña Plantillas ─────────────────────────────────────────────────
interface TemplatesTabProps {
  templates: EmailTemplateView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  editingKey: string | null;
  tplForm: { subject: string; body: string };
  setTplForm: React.Dispatch<React.SetStateAction<{ subject: string; body: string }>>;
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

function TemplatesTab(p: TemplatesTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const visibleTemplates = p.templates.filter((template) => template.key === p.editingKey ||
    ((category === "Todas" || templateCategory(template.key) === category) && `${template.displayName} ${template.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
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
        <div><h2 className="text-lg font-semibold text-yambo-black">Tus plantillas de correo</h2><p className="mt-1 text-sm text-gray-500">Reconoce cada correo por su diseño y abre el que quieras editar.</p></div>
        <input aria-label="Buscar plantillas" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una plantilla…" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm sm:w-72 focus:outline-none focus:ring-2 focus:ring-yambo-green-400" />
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar plantillas por categoría">
        {["Todas", "Pedidos", "Incidencias", "Acceso y cuentas", "Actividades"].map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`rounded-full px-3.5 py-2 text-sm font-medium ${category === value ? "bg-yambo-green-600 text-white" : "bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"}`}>{value}</button>)}
        <span className="ml-auto text-xs text-gray-400" aria-live="polite">{visibleTemplates.length} plantillas</span>
      </div>
      {visibleTemplates.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">No hay plantillas que coincidan. Prueba otro nombre o categoría.</p>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visibleTemplates.map((tpl) => {
        const isEditing = p.editingKey === tpl.key;
        if (!isEditing) return <TemplatePreviewCard key={tpl.key} template={tpl} canEdit={p.canUpdateTpl} onEdit={() => p.onEdit(tpl)} />;
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
                <p className="text-xs text-gray-400 mt-1">{tpl.description}</p>
                <p className="mt-2 text-xs text-gray-400">{tpl.tokens.length} variables disponibles en el editor</p>
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
                        p.setTplForm((f) => ({ ...f, subject: e.target.value }))
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
                      onChange={(v) => p.setTplForm((f) => ({ ...f, body: v }))}
                      tokens={toEmailTokens(tpl.tokens)}
                      title={tpl.displayName}
                      onServerPreview={p.previewingTpl ? undefined : p.onPreview}
                      onSave={p.savingTpl ? undefined : p.onSave}
                      onReset={tpl.overridden && !p.savingTpl ? () => p.setConfirmReset(true) : undefined}
                      onSendTest={!p.sendingTest && p.testEmail.trim() ? p.onTest : undefined}
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
                  <PreviewFrame html={p.tplPreview} label={t("emails.previewLabel")} />
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

// ── Pestaña Comunicados ────────────────────────────────────────────────
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
  onNew: () => void;
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

function CampaignsTab(p: CampaignsTabProps) {
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
          <ButtonComponent onClick={p.onNew} variant="primary">
            {t("emails.newCampaign")}
          </ButtonComponent>
        </div>
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
                    {p.audienceLabel(c)} · {t("emails.recipientCount", { count: c.recipientCount })}
                    {c.sentAt ? ` · ${t("emails.sentAt")}: ${formatDateTime(c.sentAt)}` : ""}
                    {!c.sentAt ? ` · ${t("emails.createdAt")}: ${formatDateTime(c.createdAt)}` : ""}
                  </p>
                </div>
                {!isEditing && (
                  <div className="flex gap-2">
                    {p.canUpdate && !isSent && (
                      <ButtonComponent onClick={() => p.onEdit(c)} variant="primary" size="sm">
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
            <h2 className="font-semibold text-yambo-black">{t("emails.newCampaign")}</h2>
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
        message={t("emails.deleteMsg", { subject: p.deleteTarget?.subject ?? "" })}
        confirmLabel={t("emails.delete")}
        variant="danger"
        isLoading={p.busyDialog}
      />
    </div>
  );
}

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

function CampaignEditor(p: CampaignEditorProps) {
  const [tokens, setTokens] = useState(CAMPAIGN_TOKENS);
  useEffect(() => {
    let active = true;
    campaignService.variables().then((items) => { if (active && items.length) setTokens(toEmailTokens(items)); }).catch(() => { /* The complete local catalog remains usable while offline. */ });
    return () => { active = false; };
  }, []);
  const { t } = p;
  const subjectInput = useRef<HTMLInputElement>(null);
  const insertSubjectVariable = (name: string) => {
    const field = subjectInput.current;
    const start = field?.selectionStart ?? p.form.subject.length;
    const end = field?.selectionEnd ?? start;
    const marker = '${' + name + '}';
    p.setForm((value) => ({ ...value, subject: value.subject.slice(0, start) + marker + value.subject.slice(end) }));
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + marker.length, start + marker.length); });
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500"><span>Insertar en el asunto:</span>{[["nombre", "Nombre"], ["email", "Email"], ["fecha", "Fecha"]].map(([key, label]) => <button key={key} type="button" aria-label={`Insertar ${key} en asunto`} onClick={() => insertSubjectVariable(key)} className="rounded-md border border-gray-200 bg-white px-2 py-1 font-mono hover:border-yambo-green-400">{label}</button>)}</div>
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
              onChange={(e) => set((s) => ({ ...s, audienceRef: e.target.value }))}
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
              onChange={(e) => set((s) => ({ ...s, audienceRef: e.target.value }))}
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
                  set((s) => ({ ...s, audienceRef: e.target.value, audienceUsers: [] }))
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
                value={f.audienceRef === "" ? "" : (f.audienceRef && !p.groups.length ? "loading" : "pickgroup")}
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
                <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.audienceUsers.includes(u.id)}
                    onChange={() => p.onToggleUser(u.id)}
                    className="rounded border-gray-300 text-yambo-green-600"
                  />
                  <span>{u.name}</span>
                  {u.email && <span className="text-gray-400 text-xs">({u.email})</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("emails.body")}
          </label>
          <p className="mb-2 text-xs text-gray-500">Nombre, usuario y email se sustituyen por los de cada destinatario al enviar. La vista previa usa un socio ficticio; la del servidor muestra la última versión guardada.</p>
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
        <ButtonComponent onClick={p.onSave} variant="primary" isLoading={p.saving}>
          {t("emails.save")}
        </ButtonComponent>
        <ButtonComponent
          onClick={p.onPreview}
          variant="neutral"
          isLoading={p.previewing}
        >
          {t("emails.preview")}
        </ButtonComponent>
        <ButtonComponent onClick={p.onClose} variant="secondary" disabled={p.saving}>
          {t("common.cancel")}
        </ButtonComponent>
      </div>

      {p.preview && <PreviewFrame html={p.preview} label={t("emails.previewLabel")} />}
    </div>
  );
}

// ── Pestaña Elementos comunes ──────────────────────────────────────────
interface CommonElementsTabProps {
  elements: EmailCommonElementView[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  editingKey: string | "new" | null;
  form: { name: string; html: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; html: string; description: string }>>;
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

function CommonElementsTab(p: CommonElementsTabProps) {
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

      {p.editingKey !== "new" && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {p.elements.map((el) => {
          const isEditing = p.editingKey === el.key;
          if (!isEditing) return <CommonComponentCard key={el.key} element={el} canEdit={p.canUpdate} onEdit={() => p.onEdit(el)} />;
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
                    <p className="text-xs text-gray-400 mt-1">{el.description}</p>
                  )}
                </div>
                {!isEditing && p.canUpdate && (
                  <ButtonComponent onClick={() => p.onEdit(el)} variant="primary" size="sm">
                    {t("common.edit")}
                  </ButtonComponent>
                )}
              </div>

              {!isEditing && (
                <PreviewFrame html={el.html} label={t("emails.previewLabel")} />
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
                    <ButtonComponent onClick={p.onSave} variant="primary" isLoading={p.saving}>
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
                    <ButtonComponent onClick={p.onClose} variant="secondary" disabled={p.saving}>
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
      </div>}

      {p.editingKey === "new" && <ComponentComposer form={p.form} setForm={p.setForm} saving={p.saving} onSave={p.onSave} onClose={p.onClose} />}

      {/* Diálogo de borrado */}
      <ConfirmDialog
        isOpen={!!p.deleteTarget}
        onClose={p.onDeleteClose}
        onConfirm={p.onDeleteConfirm}
        title={t("emails.commonDeleteTitle")}
        message={t("emails.commonDeleteMsg", { name: p.deleteTarget?.name ?? "" })}
        confirmLabel={t("emails.delete")}
        variant="danger"
        isLoading={p.saving}
      />
    </div>
  );
}
