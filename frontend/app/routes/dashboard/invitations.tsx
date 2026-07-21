import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Profile } from "~/types/userType";
import { getErrorMessage } from "~/types/error";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import toast from "react-hot-toast";
import type { GroupRole } from "~/types/role";

export function meta() {
    return [
        { title: i18n.t("invitations.metaTitle") },
        {
            name: "description",
            content: i18n.t("invitations.metaTitle"),
        },
    ];
}

export default function Invitations() {
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { activeTab, setActiveTab } = useViewTab("actual");

    const loadProfiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const [profilesResponse, invitationsResponse, projectsData] = await Promise.all([
                profileService.getAllProfiles(),
                invitationService.listInvitations(startDate),
                projectService.listProjects(0, 200),
            ]);
            setProfiles(profilesResponse);
            setInvitations(invitationsResponse);
            setProjects(projectsData.content || []);
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
            const payload: any = {};
            if (invitationType === "profile") {
                payload.profileIds = selectedProfiles;
            } else {
                payload.projectId = selectedProjectId;
                payload.role = selectedRole;
            }
            payload.startTms = startTms || undefined;
            payload.endTms = endTms || undefined;

            const invitation = await invitationService.createInvitation(payload);
            setLastInvitation(invitation);
            setSelectedProfiles([]);
            setSelectedProjectId("");
            setSelectedRole("MONITOR");
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
                            }}
                            features={{
                                enableFilters: true,
                                enablePagination: true,
                            }}
                        />
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
