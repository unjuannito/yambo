import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import { RequirePermission } from "~/components/common/RequirePermission";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { profileService } from "~/services/profileService";
import { projectService, type Project } from "~/services/projectService";
import {
    invitationService,
    type Invitation,
} from "~/services/invitationService";
import {
    projectRoleInvitationService,
    type ProjectRoleInvitation,
    type InvitationUsage,
} from "~/services/projectRoleInvitationService";
import type { Profile } from "~/types/userType";
import { getErrorMessage } from "~/types/error";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import toast from "react-hot-toast";
import type { GroupRole } from "~/types/role";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faLinkSlash, faCheck, faUsers, faShieldHalved, faCalendarDays, faEnvelopesBulk, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { NominativeInvitationsView } from "./nominative-invitations";

export function meta() {
    return [
        { title: i18n.t("invitations.metaTitle") },
        {
            name: "description",
            content: i18n.t("invitations.metaTitle"),
        },
    ];
}

function InvitationsGeneral() {
    const { t } = useTranslation();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedRole, setSelectedRole] = useState<GroupRole>("MONITOR");
    const [invitationType, setInvitationType] = useState<"profile" | "role">("profile");
    const [startTms, setStartTms] = useState("");
    const [endTms, setEndTms] = useState("");
    const [creating, setCreating] = useState(false);
    const [lastInvitation, setLastInvitation] =
        useState<Invitation | null>(null);
    const [roleInvitations, setRoleInvitations] = useState<ProjectRoleInvitation[]>([]);
    const [roleUsages, setRoleUsages] = useState<Record<string, InvitationUsage[]>>({});
    const [roleMaxUses, setRoleMaxUses] = useState("");
    const [lastRoleInvitation, setLastRoleInvitation] = useState<ProjectRoleInvitation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [beneficiariesModal, setBeneficiariesModal] = useState<{
        title: string;
        items: BeneficiaryItem[];
    } | null>(null);
    const { activeTab, setActiveTab } = useViewTab("actual");

    interface BeneficiaryItem {
        userId: string;
        name: string;
        date: string;
        isNew?: boolean;
    }

    const openLinkBeneficiaries = (invitation: Invitation) => {
        const regs = invitation.registrations ?? [];
        if (regs.length === 0) return;
        setBeneficiariesModal({
            title: t("invitations.beneficiaries"),
            items: regs.map((reg) => ({
                userId: reg.userId,
                name: reg.name || reg.userId,
                date: reg.registeredAt,
            })),
        });
    };

    const openRoleBeneficiaries = (inv: ProjectRoleInvitation) => {
        const usages = roleUsages[inv.id] ?? [];
        if (usages.length === 0) return;
        const project = projects.find((p) => p.id === inv.projectId);
        setBeneficiariesModal({
            title: `${t("invitations.beneficiaries")} · ${project?.name || inv.projectId}`,
            items: usages.map((usage) => ({
                userId: usage.userId,
                name: usage.userName || usage.userEmail || usage.userId,
                date: usage.usedAt,
                isNew: usage.wasNewRegistration,
            })),
        });
    };

    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const [profilesResponse, invitationsResponse, projectsData, roleLinks] = await Promise.all([
                profileService.getAllProfiles(),
                invitationService.listInvitations(startDate),
                projectService.listProjects(0, 200),
                projectRoleInvitationService.getInvitations(),
            ]);
            setProfiles(profilesResponse);
            setInvitations(invitationsResponse);
            setProjects(projectsData.content || []);
            setRoleInvitations(roleLinks);
            // Cargar beneficiarios de cada link de rol (quién lo usó y cuándo)
            const usagesMap: Record<string, InvitationUsage[]> = {};
            await Promise.all(
                roleLinks.map(async (link) => {
                    try {
                        usagesMap[link.id] = await projectRoleInvitationService.getUsages(link.id);
                    } catch {
                        usagesMap[link.id] = [];
                    }
                }),
            );
            setRoleUsages(usagesMap);
        } catch (err) {
            setError(getErrorMessage(err, t("invitations.profilesLoadingError")));
        } finally {
            setLoading(false);
        }
    }, [activeTab, t]);

    useEffect(() => {
        void loadProfiles();
    }, [loadProfiles]);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : t("invitations.noEnd");

    const isExpired = (invitation: Invitation) =>
        invitation.expiresAt
            ? new Date(invitation.expiresAt) < new Date()
            : false;

    const profileOptions = useMemo(
        () =>
            profiles.map((profile) => ({
                value: profile.id,
                label: `${profile.name} (${profile.id})`,
            })),
        [profiles],
    );

    const projectOptions = useMemo(
        () => projects.map((p) => ({ value: p.id, label: p.name })),
        [projects],
    );

    const roleOptions = [
        { value: "MONITOR", label: t("invitations.roleMonitor") },
        { value: "COORDINATOR", label: t("invitations.roleCoordinator") },
        { value: "PARENT", label: t("invitations.roleParent") },
    ];

    const invitationLink = useMemo(() => {
        if (!lastInvitation) return "";
        return `${baseUrl}/register?invite=${lastInvitation.token}`;
    }, [baseUrl, lastInvitation]);

    // Estado de un link de rol: activo / agotado / expirado / deshabilitado
    const roleLinkStatus = (inv: ProjectRoleInvitation): {
        label: string;
        tone: "green" | "amber" | "gray" | "red";
    } => {
        if (inv.disabled) return { label: "Deshabilitado", tone: "red" };
        if (inv.expired) return { label: "Expirado", tone: "gray" };
        if (inv.used) return { label: "Agotado", tone: "amber" };
        return { label: "Activo", tone: "green" };
    };

    const roleStatusClass = (tone: string) => {
        switch (tone) {
            case "green": return "bg-yambo-green-50 text-yambo-green-700";
            case "amber": return "bg-amber-50 text-amber-700";
            case "red": return "bg-red-50 text-red-700";
            default: return "bg-gray-100 text-gray-500";
        }
    };

    const toggleRoleLink = async (inv: ProjectRoleInvitation) => {
        try {
            await projectRoleInvitationService.updateInvitation(inv.id, {
                enabled: inv.disabled,
            });
            toast.success(inv.disabled ? "Enlace habilitado" : "Enlace deshabilitado");
            setRoleInvitations(await projectRoleInvitationService.getInvitations());
        } catch (err) {
            toast.error(getErrorMessage(err, "Error al actualizar el enlace"));
        }
    };

    const copyRoleLink = async (inv: ProjectRoleInvitation) => {
        try {
            await navigator.clipboard.writeText(inv.invitationLink);
            toast.success(t("invitations.linkCopied"));
        } catch {
            toast.error(t("invitations.linkCopyError"));
        }
    };

    const handleCreate = async () => {
        if (invitationType === "profile" && selectedProfiles.length === 0) {
            toast.error(t("invitations.selectProfileFirst"));
            return;
        }
        if (invitationType === "role" && !selectedProjectId) {
            toast.error(t("invitations.selectProjectFirst"));
            return;
        }

        try {
            setCreating(true);
            if (invitationType === "role") {
                const payload: {
                    projectId: string;
                    role: GroupRole;
                    expiresAt?: string;
                    maxUses?: number;
                } = {
                    projectId: selectedProjectId,
                    role: selectedRole,
                };
                if (endTms) payload.expiresAt = new Date(endTms).toISOString();
                if (roleMaxUses) payload.maxUses = Number(roleMaxUses);
                const invitation = await projectRoleInvitationService.createInvitation(payload);
                setLastRoleInvitation(invitation);
                setLastInvitation(null);
                setSelectedProjectId("");
                setSelectedRole("MONITOR");
                setRoleMaxUses("");
                setIsModalOpen(false);
                toast.success(t("invitations.createdSuccess"));
                const roleLinks = await projectRoleInvitationService.getInvitations();
                setRoleInvitations(roleLinks);
                return;
            }

            const payload: any = {};
            payload.profileIds = selectedProfiles;
            payload.startTms = startTms || undefined;
            payload.endTms = endTms || undefined;

            const invitation = await invitationService.createInvitation(payload);
            setLastInvitation(invitation);
            setSelectedProfiles([]);
            setStartTms("");
            setEndTms("");
            setIsModalOpen(false);
            toast.success(t("invitations.createdSuccess"));
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const updated = await invitationService.listInvitations(startDate);
            setInvitations(updated);
        } catch (err) {
            toast.error(getErrorMessage(err, t("invitations.createError")));
        } finally {
            setCreating(false);
        }
    };

    const columns: FilterableColumn<Invitation & { computedStatus: string }>[] = useMemo(
        () => [
            {
                key: "token",
                header: t("invitations.token"),
                className: "hidden md:table-cell",
                render: (invitation) => (
                    <span className="font-mono text-xs break-all text-gray-500">
                        {invitation.token}
                    </span>
                ),
            },
            {
                key: "invitationLink" as any,
                header: t("invitations.registrationLink"),
                render: (invitation) => {
                    const link = `${baseUrl}/register?invite=${invitation.token}`;
                    const expired = isExpired(invitation);
                    const handleCopy = () => {
                        if (!link || expired) return;
                        navigator.clipboard.writeText(link)
                            .then(() => toast.success(t("invitations.linkCopied")))
                            .catch(() => toast.error(t("invitations.linkCopyError")));
                    };
                    return (
                        <ButtonComponent
                            variant={expired ? "neutral" : "primary"}
                            className={
                                expired
                                    ? "cursor-not-allowed opacity-50 text-xs"
                                    : "text-xs"
                            }
                            onClick={handleCopy}
                        >
                            {t("invitations.copyLink")}
                        </ButtonComponent>
                    );
                },
            },
            {
                key: "startTms",
                header: t("invitations.startDate"),
                className: "hidden sm:table-cell",
                render: (invitation) => (
                    <span className="text-sm text-gray-500">
                        {new Date(invitation.startTms).toLocaleString()}
                    </span>
                ),
            },
            {
                key: "expiresAt",
                header: t("invitations.endDate"),
                className: "hidden sm:table-cell",
                render: (invitation) => (
                    <span className="text-sm text-gray-500">
                        {formatDateTime(invitation.expiresAt)}
                    </span>
                ),
            },
            {
                key: "profileIds",
                header: t("invitations.profiles"),
                className: "hidden md:table-cell",
                filter: {
                    enabled: true,
                    type: "multi-select",
                    placeholder: t("invitations.filterProfiles"),
                    options: profileOptions,
                },
                render: (invitation) => {
                    const names = invitation.profileIds
                        .map(
                            (id) =>
                                profiles.find((profile) => profile.id === id)
                                    ?.name || id,
                        )
                        .join(", ");
                    return (
                        <span className="text-sm text-gray-500">
                            {names || "-"}
                        </span>
                    );
                },
            },
            {
                key: "beneficiaries",
                header: t("invitations.beneficiaries"),
                render: (invitation) => {
                    const regs = invitation.registrations ?? [];
                    if (regs.length === 0) return <span className="text-sm text-gray-400">—</span>;
                    return (
                        <button
                            type="button"
                            onClick={() => openLinkBeneficiaries(invitation)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yambo-green-50 text-yambo-green-700 text-xs font-medium hover:bg-yambo-green-100 transition-colors"
                            title={t("invitations.viewBeneficiaries")}
                        >
                            <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                            {regs.length}
                        </button>
                    );
                },
            },
            {
                key: "computedStatus",
                header: t("invitations.status"),
                filter: {
                    enabled: true,
                    type: "multi-select",
                    placeholder: t("invitations.filterStatus"),
                    options: [
                        { value: t("invitations.statusActive"), label: t("invitations.statusActive") },
                        { value: t("invitations.statusPending"), label: t("invitations.statusPending") },
                        { value: t("invitations.statusExpired"), label: t("invitations.statusExpired") },
                    ],
                },
                render: (invitation) => {
                    const status = invitation.computedStatus;
                    let cls = "bg-yambo-green-50 text-yambo-green-700";
                    if (status === t("invitations.statusPending")) cls = "bg-amber-50 text-amber-700";
                    else if (status === t("invitations.statusExpired")) cls = "bg-gray-100 text-gray-500";
                    return (
                        <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${cls}`}
                        >
                            {status}
                        </span>
                    );
                },
            },
            {
                key: "id",
                header: t("invitations.actions"),
                requiredPerms: [{ obj: "invitation", action: "update" }],
                render: (invitation) => {
                    const expired = isExpired(invitation);
                    const handleDisable = async () => {
                        if (expired) return;
                        try {
                            await invitationService.disableInvitation(
                                invitation.id,
                            );
                            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
                            const updated = await invitationService.listInvitations(startDate);
                            setInvitations(updated);
                            toast.success(t("invitations.disabledSuccess"));
                        } catch (err) {
                            toast.error(
                            getErrorMessage(err, t("invitations.disableError")),
                            );
                        }
                    };
                    return (
                    <ButtonComponent
                        variant={expired ? "destructive-text" : "destructive"}
                        className={expired ? "cursor-not-allowed opacity-50 text-xs" : "text-xs"}
                        onClick={handleDisable}
                    >
                        {t("invitations.disableButton")}
                    </ButtonComponent>
                    );
                },
            },
        ],
        [profiles, profileOptions, t, baseUrl, isExpired, activeTab, formatDateTime],
    );

    const enrichedInvitations = useMemo(() => {
        const now = new Date();
        return invitations.map((inv) => {
            const start = new Date(inv.startTms);
            const end = inv.expiresAt ? new Date(inv.expiresAt) : null;
            let computedStatus = t("invitations.statusActive");
            if (now < start) computedStatus = t("invitations.statusPending");
            else if (end && now > end) computedStatus = t("invitations.statusExpired");
            return { ...inv, computedStatus };
        });
    }, [invitations, t]);

    return (
        <RequirePermission
            permission={{ obj: "invitation", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <main className="flex flex-col p-4 md:p-6 w-full">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black">
                        {t("invitations.title")}
                    </h1>
                    {!loading && !error && (
                        <RequirePermission
                            permission={{ obj: "invitation", action: "create" }}
                            redirect={false}
                        >
                            <ButtonComponent
                                variant="primary"
                                onClick={() => setIsModalOpen(true)}
                            >
                                {t("invitations.newInvitation")}
                            </ButtonComponent>
                        </RequirePermission>
                    )}
                </div>

                <ViewTabs activeTab={activeTab} onTabChange={setActiveTab} />

                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner
                            size="md"
                            message={t("invitations.loadingProfiles")}
                        />
                    </div>
                )}

                {error && (
                    <div className="mb-6">
                        <ErrorMessage message={error} onRetry={loadProfiles} />
                    </div>
                )}

                {!loading && !error && (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                            {t("invitations.createdInvitations")}
                        </h2>
                        <FilterableTable
                            columns={columns}
                            data={enrichedInvitations}
                            keyField="id"
                            display={{
                                emptyMessage: t("invitations.noInvitations"),
                                renderMobileCard: (invitation) => {
                                    const regs = invitation.registrations ?? [];
                                    const status = invitation.computedStatus;
                                    let statusCls = "bg-yambo-green-50 text-yambo-green-700";
                                    if (status === t("invitations.statusPending")) statusCls = "bg-amber-50 text-amber-700";
                                    else if (status === t("invitations.statusExpired")) statusCls = "bg-gray-100 text-gray-500";
                                    const profileNames = invitation.profileIds
                                        .map((id) => profiles.find((p) => p.id === id)?.name || id)
                                        .join(", ");
                                    return (
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-mono text-xs text-gray-400 break-all leading-tight flex-1">
                                                    {invitation.token}
                                                </span>
                                                <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${statusCls}`}>
                                                    {status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                                {profileNames && (
                                                    <span className="flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faShieldHalved} className="w-3 h-3 text-gray-400" />
                                                        {profileNames}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-gray-400" />
                                                    {new Date(invitation.startTms).toLocaleDateString()}
                                                    {invitation.expiresAt && ` — ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openLinkBeneficiaries(invitation)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yambo-green-50 text-yambo-green-700 text-xs font-medium hover:bg-yambo-green-100 transition-colors"
                                                    disabled={regs.length === 0}
                                                >
                                                    <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                                                    {regs.length > 0
                                                        ? t("invitations.beneficiaryCount", { count: regs.length })
                                                        : "—"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const link = `${baseUrl}/register?invite=${invitation.token}`;
                                                        navigator.clipboard.writeText(link)
                                                            .then(() => toast.success(t("invitations.linkCopied")))
                                                            .catch(() => toast.error(t("invitations.linkCopyError")));
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                                                    title={t("invitations.copyLink")}
                                                >
                                                    <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                },
                            }}
                            features={{
                                enableFilters: true,
                                enablePagination: true,
                            }}
                        />
                    </section>
                )}

                {!loading && !error && (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-1">
                            Links de invitación por rol
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Enlaces que asignan un rol (coordinador, monitor o padre) en un proyecto. Puedes limitar los usos, la fecha de expiración y deshabilitarlos.
                        </p>
                        {roleInvitations.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                No hay links de rol creados todavía. Créalos con el botón «Nueva invitación» seleccionando «Por proyecto y rol».
                            </p>
                        ) : (
                            <>
                            {/* Cards móviles (<768px) — patrón drops/projects */}
                            <div className="md:hidden space-y-3">
                                {roleInvitations.map((inv) => {
                                    const status = roleLinkStatus(inv);
                                    const project = projects.find(p => p.id === inv.projectId);
                                    const usageCount = (roleUsages[inv.id] ?? []).length;
                                    const roleLabel = inv.role === "COORDINATOR" ? "Coordinador" : inv.role === "MONITOR" ? "Monitor" : "Padre";
                                    return (
                                        <div key={inv.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-bold text-yambo-black text-sm leading-tight flex-1">
                                                    {project?.name || inv.projectId}
                                                </span>
                                                <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0 ${roleStatusClass(status.tone)}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-yambo-green-50 text-yambo-green-700">
                                                    {roleLabel}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faUsers} className="w-3 h-3 text-gray-400" />
                                                    {inv.maxUses != null
                                                        ? `${inv.usageCount} / ${inv.maxUses}`
                                                        : `${inv.usageCount} usos`}
                                                </span>
                                                {inv.expiresAt && (
                                                    <span className="flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-gray-400" />
                                                        {new Date(inv.expiresAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openRoleBeneficiaries(inv)}
                                                    disabled={usageCount === 0}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yambo-green-50 text-yambo-green-700 text-xs font-medium hover:bg-yambo-green-100 transition-colors"
                                                >
                                                    <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                                                    {usageCount > 0
                                                        ? t("invitations.beneficiaryCount", { count: usageCount })
                                                        : "—"}
                                                </button>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyRoleLink(inv)}
                                                        title="Copiar enlace"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-yambo-green-50 hover:text-yambo-green-700 transition-colors"
                                                    >
                                                        <FontAwesomeIcon icon={faCopy} className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRoleLink(inv)}
                                                        title={inv.disabled ? "Habilitar enlace" : "Deshabilitar enlace"}
                                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 transition-colors ${
                                                            inv.disabled
                                                                ? "text-yambo-green-600 hover:bg-yambo-green-50"
                                                                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
                                                        }`}
                                                    >
                                                        <FontAwesomeIcon icon={inv.disabled ? faCheck : faLinkSlash} className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tabla desktop (≥768px) */}
                            <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0">
                                <table className="w-full text-sm min-w-[640px]">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                                            <th className="px-4 py-2">Proyecto</th>
                                            <th className="px-4 py-2">Rol</th>
                                            <th className="px-4 py-2">Usos</th>
                                            <th className="px-4 py-2">Beneficiarios</th>
                                            <th className="px-4 py-2 hidden sm:table-cell">Expira</th>
                                            <th className="px-4 py-2">Estado</th>
                                            <th className="px-4 py-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roleInvitations.map((inv) => {
                                            const status = roleLinkStatus(inv);
                                            const project = projects.find(p => p.id === inv.projectId);
                                            return (
                                                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                                                    <td className="px-4 py-3 font-medium text-yambo-black">
                                                        {project?.name || inv.projectId}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 text-xs rounded-full bg-yambo-green-50 text-yambo-green-700">
                                                            {inv.role === "COORDINATOR" ? "Coordinador" : inv.role === "MONITOR" ? "Monitor" : "Padre"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        {inv.maxUses != null
                                                            ? `${inv.usageCount} / ${inv.maxUses}`
                                                            : `${inv.usageCount} usos`}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(roleUsages[inv.id] ?? []).length === 0 ? (
                                                            <span className="text-sm text-gray-400">—</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => openRoleBeneficiaries(inv)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yambo-green-50 text-yambo-green-700 text-xs font-medium hover:bg-yambo-green-100 transition-colors"
                                                                title={t("invitations.viewBeneficiaries")}
                                                            >
                                                                <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
                                                                {(roleUsages[inv.id] ?? []).length}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                                                        {inv.expiresAt
                                                            ? new Date(inv.expiresAt).toLocaleDateString()
                                                            : "Sin expiración"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${roleStatusClass(status.tone)}`}>
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => copyRoleLink(inv)}
                                                                title="Copiar enlace"
                                                                className="p-2 text-gray-400 hover:text-yambo-green-600 rounded-lg hover:bg-yambo-green-50 transition-colors"
                                                            >
                                                                <FontAwesomeIcon icon={faCopy} className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleRoleLink(inv)}
                                                                title={inv.disabled ? "Habilitar enlace" : "Deshabilitar enlace"}
                                                                className={`p-2 rounded-lg transition-colors ${
                                                                    inv.disabled
                                                                        ? "text-yambo-green-600 hover:bg-yambo-green-50"
                                                                        : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                }`}
                                                            >
                                                                <FontAwesomeIcon icon={inv.disabled ? faCheck : faLinkSlash} className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            </>
                        )}
                    </section>
                )}

                {lastRoleInvitation && (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                            Último link creado
                        </h2>
                        <div className="grid gap-4">
                            <InputComponent
                                label="Token"
                                value={lastRoleInvitation.token}
                                readOnly
                            />
                            <InputComponent
                                label="Enlace de invitación"
                                value={lastRoleInvitation.invitationLink}
                                readOnly
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputComponent
                                    label="Máximo de usos"
                                    value={lastRoleInvitation.maxUses != null ? String(lastRoleInvitation.maxUses) : "Sin límite"}
                                    readOnly
                                />
                                <InputComponent
                                    label="Expiración"
                                    value={formatDateTime(lastRoleInvitation.expiresAt)}
                                    readOnly
                                />
                            </div>
                            <ButtonComponent
                                variant="neutral"
                                onClick={async () => {
                                    if (!lastRoleInvitation.invitationLink) return;
                                    try {
                                        await navigator.clipboard.writeText(lastRoleInvitation.invitationLink);
                                        toast.success(t("invitations.linkCopied"));
                                    } catch (err) {
                                        toast.error(t("invitations.linkCopyError"));
                                    }
                                }}
                            >
                                {t("invitations.copyLink")}
                            </ButtonComponent>
                        </div>
                    </section>
                )}

                {lastInvitation && (
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mt-6">
                        <h2 className="text-lg font-bold font-display text-yambo-black mb-4">
                            {t("invitations.lastCreated")}
                        </h2>
                        <div className="grid gap-4">
                            <InputComponent
                                label={t("invitations.token")}
                                value={lastInvitation.token}
                                readOnly
                            />
                            <InputComponent
                                label={t("invitations.startDate")}
                                value={formatDateTime(lastInvitation.startTms)}
                                readOnly
                            />
                            <InputComponent
                                label={t("invitations.endDate")}
                                value={formatDateTime(lastInvitation.expiresAt)}
                                readOnly
                            />
                            <InputComponent
                                label={t("invitations.registrationLink")}
                                value={invitationLink}
                                readOnly
                            />
                            <ButtonComponent
                                variant="neutral"
                                onClick={async () => {
                                    if (!invitationLink) return;
                                    try {
                                        await navigator.clipboard.writeText(
                                            invitationLink,
                                        );
                                        toast.success(
                                            t("invitations.linkCopied"),
                                        );
                                    } catch (err) {
                                        toast.error(
                                            t("invitations.linkCopyError"),
                                        );
                                    }
                                }}
                            >
                                {t("invitations.copyLink")}
                            </ButtonComponent>
                        </div>
                    </section>
                )}

                {/* Modal de beneficiarios — quién usó cada invitación */}
                <Modal
                    isOpen={!!beneficiariesModal}
                    onClose={() => setBeneficiariesModal(null)}
                    title={beneficiariesModal?.title || t("invitations.beneficiaries")}
                    size="sm"
                >
                    {beneficiariesModal && (
                        <div className="space-y-1">
                            {beneficiariesModal.items.length === 0 ? (
                                <p className="text-sm text-gray-400 py-4 text-center">
                                    {t("invitations.noBeneficiaries")}
                                </p>
                            ) : (
                                beneficiariesModal.items.map((item) => (
                                    <div
                                        key={item.userId + item.date}
                                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-yambo-green-50 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-yambo-green-700">
                                                    {item.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/mi-espacio/admin/usuarios/${item.userId}/perfil`}
                                                    className="text-sm font-medium text-yambo-black hover:text-yambo-green-600 transition-colors block truncate"
                                                >
                                                    {item.name}
                                                </Link>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        {item.isNew && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yambo-green-50 text-yambo-green-700 shrink-0">
                                                {t("invitations.newRegistration")}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Modal>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProfiles([]);
                        setSelectedProjectId("");
                        setSelectedRole("MONITOR");
                        setInvitationType("profile");
                        setStartTms("");
                        setEndTms("");
                        setRoleMaxUses("");
                    }}
                    title={t("invitations.createLink")}
                    footer={
                        <>
                            <ButtonComponent
                                variant="neutral"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedProfiles([]);
                                    setSelectedProjectId("");
                                    setSelectedRole("MONITOR");
                                    setInvitationType("profile");
                                    setStartTms("");
                                    setEndTms("");
                                    setRoleMaxUses("");
                                }}
                            >
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent
                                variant="primary"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? t("common.loadingEllipsis") : t("common.create")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-4">
                        {/* Invitation type tabs */}
                        <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setInvitationType("profile")}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    invitationType === "profile"
                                        ? "bg-white text-yambo-green-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {t("invitations.byProfile")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setInvitationType("role")}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                    invitationType === "role"
                                        ? "bg-white text-yambo-green-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {t("invitations.byProjectRole")}
                            </button>
                        </div>

                        {invitationType === "profile" ? (
                            <MultiSelectComponent
                                label={t("invitations.profiles")}
                                options={profileOptions}
                                value={selectedProfiles}
                                placeholder={t("invitations.selectProfiles")}
                                onChange={(e) => {
                                    const selected = Array.from(
                                        e.target.selectedOptions,
                                    ).map((opt) => opt.value);
                                    setSelectedProfiles(selected);
                                }}
                            />
                        ) : (
                            <div className="flex flex-col gap-3">
                                <SelectComponent
                                    label={t("invitations.project")}
                                    value={selectedProjectId}
                                    options={projectOptions}
                                    onChange={(e) =>
                                        setSelectedProjectId(e.target.value)
                                    }
                                />
                                <SelectComponent
                                    label={t("invitations.role")}
                                    value={selectedRole}
                                    options={roleOptions}
                                    onChange={(e) =>
                                        setSelectedRole(e.target.value as GroupRole)
                                    }
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InputComponent
                                        type="number"
                                        min={1}
                                        label="Máximo de usos (opcional)"
                                        value={roleMaxUses}
                                        onChange={(e) => setRoleMaxUses(e.target.value)}
                                        placeholder="Sin límite"
                                    />
                                    <InputComponent
                                        type="datetime-local"
                                        label="Expiración (opcional)"
                                        value={endTms}
                                        onChange={(e) => setEndTms(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <InputComponent
                            label={t("invitations.startOptional")}
                            type="datetime-local"
                            value={startTms}
                            onChange={(e) => setStartTms(e.target.value)}
                        />
                        <InputComponent
                            label={t("invitations.endOptional")}
                            type="datetime-local"
                            value={endTms}
                            onChange={(e) => setEndTms(e.target.value)}
                        />
                    </div>
                </Modal>
            </main>
        </RequirePermission>
    );
}

export default function Invitations() {
    const [section, setSection] = useState<"general" | "nominative">("general");
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1 w-fit">
                <button
                    type="button"
                    onClick={() => setSection("general")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        section === "general"
                            ? "bg-white text-yambo-black shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <FontAwesomeIcon icon={faEnvelopesBulk} className="w-4 h-4" />
                    {t("invitations.title")}
                </button>
                <button
                    type="button"
                    onClick={() => setSection("nominative")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        section === "nominative"
                            ? "bg-white text-yambo-black shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                    {t("invitations.nominativeTitle")}
                </button>
            </div>
            {section === "general" ? <InvitationsGeneral /> : <NominativeInvitationsView />}
        </div>
    );
}
