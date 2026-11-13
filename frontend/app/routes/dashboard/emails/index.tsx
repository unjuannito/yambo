import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { PageContainer } from "~/components/common/PageContainer";
import { PageHeader } from "~/components/common/PageHeader";
import { useAuth } from "~/hooks/useAuth";
import { adminUserService } from "~/services/adminUserService";
import {
  campaignService,
  type CampaignRecipientSummary,
  type CampaignView,
} from "~/services/campaignService";
import {
  emailCommonElementService,
  type EmailCommonElementView,
} from "~/services/emailCommonElementService";
import {
  emailTemplateService,
  type EmailTemplateView,
} from "~/services/emailTemplateService";
import { profileService, type Profile } from "~/services/profileService";
import {
  projectService,
  type Project,
  type ProjectGroup,
} from "~/services/projectService";
import { getErrorMessage } from "~/types/error";
import type { User } from "~/types/userType";

import { CampaignsTab } from "~/components/emails/admin/CampaignsTab";
import { CommonElementsTab } from "~/components/emails/admin/CommonElementsTab";
import {
  EMPTY_CAMPAIGN_FORM,
  type CampaignForm,
} from "~/components/emails/admin/emailAdminTypes";
import { TemplatesTab } from "~/components/emails/admin/TemplatesTab";

type Tab = "templates" | "campaigns" | "common";

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
  const canUpdateTpl = hasPermission({
    obj: "email_template",
    action: "update",
  });
  const canCreateCamp = hasPermission({ obj: "campaign", action: "create" });
  const canUpdateCamp = hasPermission({ obj: "campaign", action: "update" });
  const canSendCamp = hasPermission({ obj: "campaign", action: "send" });
  const canDeleteCamp = hasPermission({ obj: "campaign", action: "delete" });
  const canReadCommon = hasPermission({ obj: "email_common", action: "read" });
  const canCreateCommon = hasPermission({
    obj: "email_common",
    action: "create",
  });
  const canUpdateCommon = hasPermission({
    obj: "email_common",
    action: "update",
  });
  const canDeleteCommon = hasPermission({
    obj: "email_common",
    action: "delete",
  });

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
    if (authLoading || !canReadTpl) {
      setTplLoading(false);
      return;
    }
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
      toast.error(getErrorMessage(err, t("emails.sendTestError")));
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
  const [campForm, setCampForm] = useState<CampaignForm>(EMPTY_CAMPAIGN_FORM);
  const [savingCamp, setSavingCamp] = useState(false);
  const [campPreview, setCampPreview] = useState<string | null>(null);
  const [previewingCamp, setPreviewingCamp] = useState(false);
  const [recipients, setRecipients] = useState<CampaignRecipientSummary | null>(
    null,
  );
  const [sendTarget, setSendTarget] = useState<CampaignView | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignView | null>(null);
  const [busyDialog, setBusyDialog] = useState(false);

  // Opciones de audiencia
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchCampaigns = useCallback(async () => {
    if (authLoading || !canReadCamp) {
      setCampLoading(false);
      return;
    }
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
    setCampForm(EMPTY_CAMPAIGN_FORM);
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
    setCampForm(EMPTY_CAMPAIGN_FORM);
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
  const [commonElements, setCommonElements] = useState<
    EmailCommonElementView[]
  >([]);
  const [commonLoading, setCommonLoading] = useState(true);
  const [commonError, setCommonError] = useState<string | null>(null);
  const [commonRefresh, setCommonRefresh] = useState(0);
  const [editingCommonKey, setEditingCommonKey] = useState<
    string | "new" | null
  >(null);
  const [commonForm, setCommonForm] = useState({
    name: "",
    html: "",
    description: "",
  });
  const [savingCommon, setSavingCommon] = useState(false);
  const [confirmResetCommon, setConfirmResetCommon] = useState(false);
  const [deleteCommonTarget, setDeleteCommonTarget] =
    useState<EmailCommonElementView | null>(null);

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
    setCommonForm({
      name: el.name,
      html: el.html,
      description: el.description ?? "",
    });
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
        await emailCommonElementService.update(editingCommonKey, {
          html: commonForm.html,
        });
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
    const permitted = {
      templates: canReadTpl,
      campaigns: canReadCamp,
      common: canReadCommon,
    };
    if (!permitted[tab])
      setTab(canReadTpl ? "templates" : canReadCamp ? "campaigns" : "common");
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
              <FontAwesomeIcon
                icon={faEnvelopeOpenText}
                className="text-yambo-green-500"
              />
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
            <FontAwesomeIcon
              icon={faEnvelopeOpenText}
              className="text-yambo-green-500"
            />
            {t("emails.pageTitle")}
          </span>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {(
          [
            ...(canReadTpl ? ["templates" as const] : []),
            ...(canReadCamp ? ["campaigns" as const] : []),
            ...(canReadCommon ? ["common" as const] : []),
          ] as Tab[]
        ).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
              tab === tb
                ? "border-yambo-green-500 text-yambo-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tb === "templates"
              ? t("emails.tabTemplates")
              : tb === "campaigns"
                ? t("emails.tabCampaigns")
                : t("emails.tabCommon")}
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
