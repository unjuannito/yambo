import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/index";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type {
    FilterableColumn,
    FetchDataParams,
} from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import InputComponent from "~/components/common/forms/InputComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import {
    profileService,
    type Profile,
    type Permission,
} from "~/services/profileService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Perfiles" },
        { name: "description", content: "Gestión de perfiles de usuario" },
    ];
}

interface ProfileForm {
    name: string;
    permissionIds: string[];
}

const EMPTY_FORM: ProfileForm = {
    name: "",
    permissionIds: [],
};

export default function Profiles() {
    const { t } = useTranslation();
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
    const [editing, setEditing] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const permissionsData = await profileService.getAllPermissions();
            setAllPermissions(permissionsData);
        } catch (err) {
            toast.error(getErrorMessage(err, t("profiles.loadError")));
        } finally {
            setLoading(false);
        }
    };

    const fetchProfilesData = useCallback(
        async ({ page, size, filters }: FetchDataParams) => {
            return await profileService.listProfiles({
                query: filters.q,
                permissions: filters.permissions,
                page,
                size,
            });
        },
        [],
    );

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(true);
    };

    const startEdit = (profile: Profile) => {
        setForm({
            name: profile.name,
            permissionIds: profile.permissions.map((p) => p.id),
        });
        setEditing(profile.id);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t("profiles.nameRequired"));
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await profileService.updateProfile(
                    editing,
                    form.name,
                    form.permissionIds,
                );
                toast.success(t("profiles.updated"));
            } else {
                await profileService.createProfile({
                    name: form.name,
                    permissionIds: form.permissionIds,
                });
                toast.success(t("profiles.created"));
            }
            resetForm();
        } catch (err) {
            toast.error(
                getErrorMessage(err, t("profiles.saveError")),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (profileId: string) => {
        setConfirmDelete(profileId);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await profileService.deleteProfile(confirmDelete);
            toast.success(t("profiles.deleted"));
        } catch (err) {
            toast.error(
                getErrorMessage(err, t("profiles.deleteError")),
            );
        } finally {
            setConfirmDelete(null);
        }
    };

    const permissionOptions = useMemo(
        () =>
            allPermissions.map((permission) => ({
                value: permission.id,
                label: permission.description || permission.id,
            })),
        [allPermissions],
    );

    const columns: FilterableColumn<Profile>[] = useMemo(
        () => [
            {
                key: "name",
                header: t("common.name"),
                filter: {
                    enabled: true,
                    type: "search",
                    placeholder: t("profiles.searchByName"),
                },
                render: (profile) => (
                    <span className="font-medium text-yambo-black">
                        {profile.name}
                        {profile.system && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-normal">
                                {t("profiles.system")}
                            </span>
                        )}
                    </span>
                ),
            },
            {
                key: "permissions",
                header: t("profiles.name"),
                filter: {
                    enabled: true,
                    type: "multi-select",
                    placeholder: t("profiles.selectPermissions"),
                    options: permissionOptions,
                },
                render: (profile) => (
                    <div className="flex flex-wrap gap-1">
                        {profile.permissions.length > 0 ? (
                            profile.permissions
                                .slice(0, 3)
                                .map((permission) => (
                                    <span
                                        key={permission.id}
                                        className="px-2 py-1 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs"
                                    >
                                        {permission.description}
                                    </span>
                                ))
                        ) : (
                            <span className="text-gray-400 text-xs italic">
                                {t("profiles.noPermissions")}
                            </span>
                        )}
                        {profile.permissions.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                                {t("profiles.morePermissions", { count: profile.permissions.length - 3 })}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "actions",
                header: t("common.actions"),
                requiredPerms: [{ obj: "profile", action: "update" }],
                render: (profile) => (
                    <div className="flex gap-2">
                        {!profile.system && (
                            <>
                                <ButtonComponent
                                    variant="primary"
                                    size="sm"
                                    onClick={() => startEdit(profile)}
                                >
                                    {t("common.edit")}
                                </ButtonComponent>
                                <ButtonComponent
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(profile.id)}
                                >
                                    {t("common.delete")}
                                </ButtonComponent>
                            </>
                        )}
                    </div>
                ),
            },
        ],
        [permissionOptions, t],
    );

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "profile", action: "read" }} redirectTo="/mi-espacio">
                <main className="flex flex-col p-4 md:p-6 w-full">
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">{t("profiles.title")}</h1>
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" message={t("profiles.loading")} />
                    </div>
                </main>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "profile", action: "read" }} redirectTo="/mi-espacio">
            <ListPageShell<Profile>
                title={t("profiles.title")}
                actions={
                    <RequirePermission permission={{ obj: "profile", action: "create" }} redirect={false}>
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            {t("profiles.createNew")}
                        </ButtonComponent>
                    </RequirePermission>
                }
                columns={columns}
                keyField="id"
                display={{
                    emptyMessage: t("profiles.noProfiles"),
                    loadingMessage: t("profiles.loading"),
                }}
                features={{ globalSearch: true }}
                serverSide={{ fetchData: fetchProfilesData }}
            />
            <Modal
                isOpen={isModalOpen}
                onClose={resetForm}
                title={editing ? t("profiles.editTitle") : t("profiles.newTitle")}
                    size="lg"
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
                                {saving ? t("common.saving") : t("common.save")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="grid gap-6">
                        <InputComponent
                            label={t("profiles.nameLabel")}
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            placeholder={t("profiles.namePlaceholder")}
                            required
                        />

                        <MultiSelectComponent
                            label={t("profiles.name")}
                            name="permissionIds"
                            value={form.permissionIds}
                            options={permissionOptions}
                            placeholder={t("profiles.selectPermissions")}
                            onChange={(e) => {
                                const selected = Array.from(
                                    (e.target as HTMLSelectElement).selectedOptions,
                                    (option) => option.value,
                                );
                                setForm((prev) => ({
                                    ...prev,
                                    permissionIds: selected,
                                }));
                            }}
                        />
                    </div>
                </Modal>
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={t("profiles.confirmDeleteTitle")}
                message={confirmDelete ? t("profiles.confirmDelete", { id: confirmDelete }) : ""}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
        </RequirePermission>
    );
}