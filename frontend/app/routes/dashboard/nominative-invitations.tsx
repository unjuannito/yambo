import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import type { Route } from "./+types/nominative-invitations";
import { RequirePermission } from "~/components/common/RequirePermission";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import { nominativeInvitationService } from "~/services/nominativeInvitationService";
import type {
    NominativeInvitation,
    CreateNominativeInvitationRequest,
} from "~/services/nominativeInvitationService";
import { projectService, type Project } from "~/services/projectService";
import { profileService } from "~/services/profileService";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import type { GroupRole } from "~/types/role";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faEnvelopesBulk } from "@fortawesome/free-solid-svg-icons";

export function meta({}: Route.MetaArgs) {
    return [
        { title: i18n.t("invitations.nominativeMetaTitle") },
        { name: "description", content: i18n.t("invitations.nominativeMetaTitle") },
    ];
}

export function NominativeInvitationsView({
    onBackToGeneral,
}: {
    onBackToGeneral?: () => void;
}) {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<NominativeInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [batchEmails, setBatchEmails] = useState("");
    const [batchProfileIds, setBatchProfileIds] = useState<string[]>([]);
    const [batchProjectId, setBatchProjectId] = useState("");
    const [batchRole, setBatchRole] = useState<GroupRole>("MONITOR");
    const [batchSaving, setBatchSaving] = useState(false);
    const [profileOptions, setProfileOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [form, setForm] = useState<CreateNominativeInvitationRequest & { projectId: string; role: GroupRole }>({
        email: "",
        name: "",
        profileIds: [],
        projectId: "",
        role: "MONITOR",
    });
    const [invitationType, setInvitationType] = useState<"profile" | "role">("profile");
    const [batchType, setBatchType] = useState<"profile" | "role">("profile");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [invData, profiles, projData] = await Promise.all([
                nominativeInvitationService.getAllInvitations(),
                profileService.getAllProfiles(),
                projectService.listProjects(0, 200),
            ]);
            setInvitations(invData);
            const options = profiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
            }));
            setProfileOptions(options);
            setProjects(projData.content || []);
        } catch (err) {
            setError(getErrorMessage(err, t("invitations.dataLoadingError")));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setForm({ email: "", name: "", profileIds: [], projectId: "", role: "MONITOR" });
        setInvitationType("profile");
        setIsModalOpen(false);
        setSaving(false);
    };

    const openCreateModal = () => {
        setForm({ email: "", name: "", profileIds: [], projectId: "", role: "MONITOR" });
        setInvitationType("profile");
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setConfirmDelete(id);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await nominativeInvitationService.deleteInvitation(confirmDelete);
            setInvitations((prev) => prev.filter((inv) => inv.id !== confirmDelete));
            toast.success(t("invitations.deleteSuccess"));
        } catch (err) {
            toast.error(getErrorMessage(err, t("invitations.deleteError")));
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleSave = async () => {
        if (!form.email.trim()) {
            toast.error(t("invitations.emailRequired"));
            return;
        }

        try {
            setSaving(true);
            const payload: any = {
                email: form.email.trim(),
                name: form.name.trim(),
                profileIds: invitationType === "profile" ? form.profileIds : [],
            };
            if (invitationType === "role" && form.projectId && form.role) {
                payload.projectId = form.projectId;
                payload.role = form.role;
            }
            const newInvitation = await nominativeInvitationService.createInvitation(payload);
            setInvitations((prev) => [newInvitation, ...prev]);
            toast.success(t("invitations.createNominativeSuccess"));
            resetForm();
        } catch (err) {
            toast.error(getErrorMessage(err, t("invitations.createNominativeError")));
        } finally {
            setSaving(false);
        }
    };

    const openBatchModal = () => {
        setBatchEmails("");
        setBatchProfileIds([]);
        setBatchProjectId("");
        setBatchRole("MONITOR");
        setBatchType("profile");
        setIsBatchModalOpen(true);
    };

    const closeBatchModal = () => {
        setBatchEmails("");
        setBatchProfileIds([]);
        setBatchProjectId("");
        setBatchRole("MONITOR");
        setIsBatchModalOpen(false);
        setBatchSaving(false);
    };

    const handleBatchSave = async () => {
        const emails = batchEmails
            .split(/[,\\\n]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0);

        if (emails.length === 0) {
            toast.error(t("invitations.atLeastOneEmail"));
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalid = emails.filter((e) => !emailRegex.test(e));
        if (invalid.length > 0) {
            toast.error(t("invitations.invalidEmails", { invalid: invalid.join(", ") }));
            return;
        }

        try {
            setBatchSaving(true);
            const payload: any = {
                emails,
                profileIds: batchType === "profile" ? batchProfileIds : [],
            };
            if (batchType === "role" && batchProjectId && batchRole) {
                payload.projectId = batchProjectId;
                payload.role = batchRole;
            }
            const result = await nominativeInvitationService.createBatchInvitations(payload);
            setInvitations((prev) => [...result.invitations, ...prev]);
            toast.success(
                t("invitations.batchCreated", { count: result.invitations.length }),
            );
            closeBatchModal();
        } catch (err) {
            toast.error(getErrorMessage(err, t("invitations.batchError")));
        } finally {
            setBatchSaving(false);
        }
    };

    const projectOptions = useMemo(
        () => projects.map((p) => ({ value: p.id, label: p.name })),
        [projects],
    );

    const roleOptions = [
        { value: "MONITOR", label: t("invitations.roleMonitor") },
        { value: "COORDINATOR", label: t("invitations.roleCoordinator") },
        { value: "PARENT", label: t("invitations.roleParent") },
    ];

    const invitationColumns: FilterableColumn<NominativeInvitation & { usedLabel: string }>[] = [
        {
            key: "id",
            header: t("invitations.nominativeId"),
            className: "hidden md:table-cell",
            render: (invitation) => (
                <span className="font-mono text-xs text-gray-400">{invitation.id}</span>
            ),
        },
        {
            key: "email",
            header: t("invitations.email"),
            filter: {
                enabled: true,
                type: "search",
                placeholder: t("invitations.searchEmail"),
            },
            render: (invitation) => (
                <div>
                    <span className="font-medium text-yambo-black">{invitation.email}</span>
                </div>
            ),
        },
        {
            key: "invitedByUser" as any,
            header: t("invitations.invitedBy"),
            className: "hidden sm:table-cell",
            render: (invitation) =>
                invitation.invitedByUser ? (
                    <Link
                        to={`/mi-espacio/admin/usuarios/${invitation.invitedByUser.id}/perfil`}
                        className="text-gray-500 hover:text-yambo-green-600 transition-colors"
                    >
                        {invitation.invitedByUser.name}
                    </Link>
                ) : (
                    <span className="text-gray-500">{t("invitations.freeEntry")}</span>
                ),
        },
        {
            key: "createdAt",
            header: t("invitations.createdAt"),
            className: "hidden sm:table-cell",
            render: (invitation) => (
                <span className="text-sm text-gray-400">
                    {new Date(invitation.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "expiresAt",
            header: t("invitations.expiresAt"),
            className: "hidden md:table-cell",
            render: (invitation) => (
                <span className="text-sm text-gray-400">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: "usedLabel",
            header: t("invitations.used"),
            filter: {
                enabled: true,
                type: "select",
                placeholder: t("invitations.filterAll"),
                options: [
                    { value: "", label: t("invitations.filterAll") },
                    { value: t("invitations.usedYes"), label: t("invitations.usedYes") },
                    { value: t("invitations.usedNo"), label: t("invitations.usedNo") },
                ],
            },
            render: (invitation) => (
                <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        invitation.used
                            ? "bg-yambo-green-50 text-yambo-green-700"
                            : "bg-coral/10 text-coral"
                    }`}
                >
                    {invitation.used ? t("invitations.usedYes") : t("invitations.usedNo")}
                </span>
            ),
        },
        {
            key: "usedByUser" as any,
            header: t("invitations.usedBy"),
            render: (invitation) => {
                if (!invitation.usedByUser) {
                    return <span className="text-sm text-gray-400">—</span>;
                }
                return (
                    <div className="flex items-center gap-1.5 text-sm">
                        <Link
                            to={`/mi-espacio/admin/usuarios/${invitation.usedByUser.id}/perfil`}
                            className="font-medium text-yambo-black hover:text-yambo-green-600 transition-colors"
                        >
                            {invitation.usedByUser.name}
                        </Link>
                        {invitation.usedAt && (
                            <span className="text-xs text-gray-400">
                                {new Date(invitation.usedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "id",
            header: t("invitations.actions"),
            requiredPerms: [{ obj: "invitation", action: "update" }],
            render: (invitation) => (
                <ButtonComponent
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(invitation.id)}
                    disabled={invitation.used}
                >
                    {t("invitations.deleteButton")}
                </ButtonComponent>
            ),
        },
    ];

    const enrichedInvitations = useMemo(
        () => invitations.map((inv) => ({ ...inv, usedLabel: inv.used ? t("invitations.computedUsedYes") : t("invitations.computedUsedNo") })),
        [invitations, t],
    );

    return (
        <RequirePermission
            permission={{ obj: "invitation", action: "read" }}
            redirectTo="/mi-espacio"
        >
            <ListPageShell<NominativeInvitation & { usedLabel: string }>
                title={t("invitations.nominativeTitle")}
                actions={
                    <RequirePermission
                        permission={{ obj: "invitation", action: "create" }}
                        redirect={false}
                    >
                        <div className="flex gap-2">
                            <ButtonComponent variant="primary" onClick={openBatchModal}>
                                {t("invitations.nominativeBatch")}
                            </ButtonComponent>
                            <ButtonComponent variant="primary" onClick={openCreateModal}>
                                {t("invitations.nominativeNew")}
                            </ButtonComponent>
                        </div>
                    </RequirePermission>
                }
                columns={invitationColumns}
                keyField="id"
                data={enrichedInvitations}
                display={{
                    emptyMessage: t("invitations.noInvitations"),
                    loadingMessage: t("invitations.loading"),
                    renderMobileCard: (invitation) => (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-yambo-black truncate">
                                        {invitation.email}
                                    </p>
                                    <p className="text-xs text-gray-400 font-mono truncate">
                                        {invitation.id}
                                    </p>
                                </div>
                                <span
                                    className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                                        invitation.used
                                            ? "bg-yambo-green-50 text-yambo-green-700"
                                            : "bg-coral/10 text-coral"
                                    }`}
                                >
                                    {invitation.used ? t("invitations.usedYes") : t("invitations.usedNo")}
                                </span>
                            </div>
                            {invitation.invitedByUser && (
                                <p className="text-xs text-gray-500">
                                    {t("invitations.invitedBy")}: {invitation.invitedByUser.name}
                                </p>
                            )}
                            <p className="text-xs text-gray-400">
                                {t("invitations.expiresAt")}: {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-1">
                                {invitation.usedByUser ? (
                                    <span className="text-xs text-gray-500 truncate">
                                        {t("invitations.usedBy")}: {invitation.usedByUser.name}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                )}
                                <ButtonComponent
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(invitation.id)}
                                    disabled={invitation.used}
                                >
                                    {t("invitations.deleteButton")}
                                </ButtonComponent>
                            </div>
                        </div>
                    ),
                }}
                features={{
                    enableFilters: true,
                    enablePagination: true,
                }}
            >
                {onBackToGeneral && (
                    <div className="flex gap-1 bg-gray-100/80 rounded-lg p-1 w-fit -mt-1 mb-2">
                        <button
                            type="button"
                            onClick={onBackToGeneral}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-500 hover:text-gray-700"
                        >
                            <FontAwesomeIcon icon={faEnvelopesBulk} className="w-4 h-4" />
                            {t("invitations.title")}
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white text-yambo-black shadow-sm"
                        >
                            <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                            {t("invitations.nominativeTitle")}
                        </button>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner size="md" message={t("invitations.loading")} />
                    </div>
                )}
                {error && (
                    <ErrorMessage message={error} onRetry={fetchData} />
                )}
            </ListPageShell>

            {/* Individual creation modal */}
            <Modal
                    isOpen={isModalOpen}
                    onClose={resetForm}
                    title={t("invitations.newNominative")}
                    footer={
                        <>
                            <ButtonComponent
                                onClick={resetForm}
                                variant="neutral"
                                disabled={saving}
                            >
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSave}
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? t("invitations.nominativeSaving") : t("common.create")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label={t("invitations.email")}
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                }))
                            }
                            required
                        />
                        <InputComponent
                            label={t("invitations.name")}
                            type="text"
                            value={form.name}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            placeholder={t("invitations.namePlaceholder")}
                        />

                        {/* Invitation type tabs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                {t("invitations.invitationType")}
                            </label>
                            <div className="flex gap-2 bg-gray-100/80 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setInvitationType("profile")}
                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
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
                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                                        invitationType === "role"
                                            ? "bg-white text-yambo-green-700 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    {t("invitations.byProjectRole")}
                                </button>
                            </div>
                        </div>

                        {invitationType === "profile" ? (
                            <MultiSelectComponent
                                label={t("invitations.profiles")}
                                name="profileIds"
                                value={form.profileIds}
                                options={profileOptions}
                                onChange={(e) => {
                                    const selected = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value
                                    );
                                    setForm((prev) => ({
                                        ...prev,
                                        profileIds: selected,
                                    }));
                                }}
                                placeholder={t("invitations.selectProfilesPlaceholder")}
                            />
                        ) : (
                            <div className="flex flex-col gap-3">
                                <SelectComponent
                                    label={t("invitations.project")}
                                    value={form.projectId}
                                    options={projectOptions}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            projectId: e.target.value,
                                        }))
                                    }
                                />
                                <SelectComponent
                                    label={t("invitations.role")}
                                    value={form.role}
                                    options={roleOptions}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            role: e.target.value as GroupRole,
                                        }))
                                    }
                                />
                            </div>
                        )}
                    </div>
                </Modal>

                {/* Batch creation modal */}
                <Modal
                    isOpen={isBatchModalOpen}
                    onClose={closeBatchModal}
                    title={t("invitations.batchTitle")}
                    footer={
                        <>
                            <ButtonComponent
                                onClick={closeBatchModal}
                                variant="neutral"
                                disabled={batchSaving}
                            >
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleBatchSave}
                                variant="primary"
                                disabled={batchSaving}
                            >
                                {batchSaving ? t("invitations.batchSaving") : t("invitations.batchTitle")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                                {t("invitations.emailPlaceholder")}
                            </label>
                            <textarea
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 transition-colors"
                                rows={6}
                                value={batchEmails}
                                onChange={(e) => setBatchEmails(e.target.value)}
                                placeholder={t("invitations.emailPlaceholderExample")}
                            />
                        </div>

                        {/* Batch type tabs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                {t("invitations.invitationType")}
                            </label>
                            <div className="flex gap-2 bg-gray-100/80 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setBatchType("profile")}
                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                                        batchType === "profile"
                                            ? "bg-white text-yambo-green-700 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    {t("invitations.byProfile")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchType("role")}
                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                                        batchType === "role"
                                            ? "bg-white text-yambo-green-700 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    {t("invitations.byProjectRole")}
                                </button>
                            </div>
                        </div>

                        {batchType === "profile" ? (
                            <MultiSelectComponent
                                label={t("invitations.profiles")}
                                name="batchProfileIds"
                                value={batchProfileIds}
                                options={profileOptions}
                                onChange={(e) => {
                                    const selected = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value,
                                    );
                                    setBatchProfileIds(selected);
                                }}
                                placeholder={t("invitations.selectProfilesPlaceholder")}
                            />
                        ) : (
                            <div className="flex flex-col gap-3">
                                <SelectComponent
                                    label={t("invitations.project")}
                                    value={batchProjectId}
                                    options={projectOptions}
                                    onChange={(e) =>
                                        setBatchProjectId(e.target.value)
                                    }
                                />
                                <SelectComponent
                                    label={t("invitations.role")}
                                    value={batchRole}
                                    options={roleOptions}
                                    onChange={(e) =>
                                        setBatchRole(e.target.value as GroupRole)
                                    }
                                />
                            </div>
                        )}
                    </div>
                </Modal>
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={t("invitations.deleteConfirmTitle")}
                message={t("invitations.deleteConfirm")}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
        </RequirePermission>
    );
}

import { Navigate } from "react-router";

export default function NominativeInvitationsRedirect() {
    return <Navigate to="/mi-espacio/admin/invitaciones" replace />;
}
