import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import type { Route } from "./+types/nominative-invitations";
import { RequirePermission } from "~/components/common/RequirePermission";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import InputComponent from "~/components/common/forms/InputComponent";
import { nominativeInvitationService } from "~/services/nominativeInvitationService";
import type {
    NominativeInvitation,
    CreateNominativeInvitationRequest,
} from "~/services/nominativeInvitationService";
import { profileService } from "~/services/profileService";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import { getErrorMessage } from "~/types/error";
import { ViewTabs, useViewTab } from "~/components/common/ViewTabs";
import { getSixMonthsAgoISO } from "~/utils/dateFilters";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: i18n.t("invitations.nominativeMetaTitle") },
        { name: "description", content: i18n.t("invitations.nominativeMetaTitle") },
    ];
}

export default function NominativeInvitations() {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<NominativeInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchEmails, setBatchEmails] = useState("");
    const [batchProfileIds, setBatchProfileIds] = useState<string[]>([]);
    const [batchSaving, setBatchSaving] = useState(false);
    const [profileOptions, setProfileOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const { activeTab, setActiveTab } = useViewTab("actual");
    const [form, setForm] = useState<CreateNominativeInvitationRequest>({
        email: "",
        name: "",
        profileIds: [],
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const startDate = activeTab === "actual" ? getSixMonthsAgoISO() : undefined;
            const [invData, profiles] = await Promise.all([
                nominativeInvitationService.getAllInvitations(startDate),
                profileService.getAllProfiles(),
            ]);
            setInvitations(invData);
            const options = profiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
            }));
            setProfileOptions(options);
        } catch (err) {
            setError(getErrorMessage(err, t("invitations.dataLoadingError")));
        } finally {
            setLoading(false);
        }
    }, [activeTab, t]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setForm({ email: "", name: "", profileIds: [] });
        setIsModalOpen(false);
        setSaving(false);
    };

    const openCreateModal = () => {
        setForm({ email: "", name: "", profileIds: [] });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t("invitations.deleteConfirm"))) {
            try {
                await nominativeInvitationService.deleteInvitation(id);
                setInvitations((prev) => prev.filter((inv) => inv.id !== id));
                toast.success(t("invitations.deleteSuccess"));
            } catch (err) {
                toast.error(getErrorMessage(err, t("invitations.deleteError")));
            }
        }
    };

    const handleSave = async () => {
        if (!form.email.trim()) {
            toast.error(t("invitations.emailRequired"));
            return;
        }

        try {
            setSaving(true);
            const newInvitation = await nominativeInvitationService.createInvitation(form);
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
        setIsBatchModalOpen(true);
    };

    const closeBatchModal = () => {
        setBatchEmails("");
        setBatchProfileIds([]);
        setIsBatchModalOpen(false);
        setBatchSaving(false);
    };

    const handleBatchSave = async () => {
        const emails = batchEmails
            .split(/[,\\n]+/)
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
            const result = await nominativeInvitationService.createBatchInvitations({
                emails,
                profileIds: batchProfileIds,
            });
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
                    <p className="text-xs text-gray-400 sm:hidden">{invitation.invitedByUser?.name || t("invitations.freeEntry")}</p>
                </div>
            ),
        },
        {
            key: "invitedByUser" as any,
            header: t("invitations.invitedBy"),
            className: "hidden sm:table-cell",
            render: (invitation) => (
                <span className="text-gray-500">{invitation.invitedByUser?.name || t("invitations.freeEntry")}</span>
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
                }}
                features={{
                    enableFilters: true,
                    enablePagination: true,
                }}
            >
                {loading && (
                    <div className="flex justify-center py-8">
                        <LoadingSpinner size="md" message={t("invitations.loading")} />
                    </div>
                )}
                {error && (
                    <ErrorMessage message={error} onRetry={fetchData} />
                )}
            </ListPageShell>

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
                    </div>
                </Modal>

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
                    </div>
                </Modal>
        </RequirePermission>
    );
}