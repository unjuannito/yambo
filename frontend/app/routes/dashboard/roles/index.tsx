import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "~/i18n/config";
import { RequirePermission } from "~/components/common/RequirePermission";
import ListPageShell from "~/components/common/ListPageShell";
import { PageHeader } from "~/components/common/PageHeader";
import { PageContainer } from "~/components/common/PageContainer";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faUserFriends } from "@fortawesome/free-solid-svg-icons";
import {
    projectRoleService,
    type ProjectRole,
} from "~/services/projectRoleService";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";

export function meta() {
    return [
        { title: i18n.t("roles.metaTitle") },
        { name: "description", content: i18n.t("roles.metaTitle") },
    ];
}

/** Claves de los tres roles sembrados por la migración: no se pueden borrar. */
const SEED_ROLE_KEYS = new Set(["MONITOR", "COORDINATOR", "PARENT"]);

interface RoleForm {
    key: string;
    name: string;
    isTeam: boolean;
}

const EMPTY_FORM: RoleForm = { key: "", name: "", isTeam: false };

export default function ProjectRoles() {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<ProjectRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
    /** Clave del rol que se está editando; `null` = creando uno nuevo. */
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<ProjectRole | null>(null);

    const loadRoles = useCallback(async () => {
        try {
            setLoading(true);
            setRoles(await projectRoleService.listRoles());
        } catch (err) {
            toast.error(getErrorMessage(err, t("roles.loadError")));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setEditingKey(null);
        setIsModalOpen(true);
    };

    const startEdit = (role: ProjectRole) => {
        setForm({ key: role.key, name: role.name, isTeam: role.isTeam });
        setEditingKey(role.key);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditingKey(null);
        setIsModalOpen(false);
    };

    const handleSave = async () => {
        const key = form.key.trim();
        const name = form.name.trim();
        if (!key) {
            toast.error(t("roles.keyRequired"));
            return;
        }
        if (key !== key.toUpperCase()) {
            toast.error(t("roles.keyHint"));
            return;
        }
        if (!name) {
            toast.error(t("roles.nameRequired"));
            return;
        }
        try {
            setSaving(true);
            if (editingKey) {
                await projectRoleService.updateRole(editingKey, {
                    name,
                    isTeam: form.isTeam,
                });
                toast.success(t("roles.updated"));
            } else {
                await projectRoleService.createRole({ key, name, isTeam: form.isTeam });
                toast.success(t("roles.created"));
            }
            resetForm();
            await loadRoles();
        } catch (err) {
            toast.error(getErrorMessage(err, t("roles.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await projectRoleService.deleteRole(confirmDelete.key);
            toast.success(t("roles.deleted"));
            setConfirmDelete(null);
            await loadRoles();
        } catch (err) {
            toast.error(getErrorMessage(err, t("roles.deleteError")));
        }
    };

    const columns = useMemo(
        () => [
            {
                key: "name",
                header: t("roles.name"),
                filter: { enabled: true, type: "search" as const, placeholder: t("roles.searchByName") },
                render: (role: ProjectRole) => (
                    <span className="font-medium text-yambo-black">
                        {role.name}
                        {SEED_ROLE_KEYS.has(role.key) && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-normal">
                                {t("roles.defaultBadge")}
                            </span>
                        )}
                    </span>
                ),
            },
            {
                key: "key",
                header: t("roles.key"),
                render: (role: ProjectRole) => (
                    <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{role.key}</code>
                ),
            },
            {
                key: "isTeam",
                header: t("roles.isTeam"),
                render: (role: ProjectRole) =>
                    role.isTeam ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs">
                            <FontAwesomeIcon icon={faUserFriends} className="w-3 h-3" />
                            {t("roles.teamBadge")}
                        </span>
                    ) : (
                        <span className="text-gray-400 text-xs">—</span>
                    ),
            },
            {
                key: "actions",
                header: t("common.actions"),
                requiredPerms: [{ obj: "project_role", action: "update" }],
                render: (role: ProjectRole) => (
                    <div className="flex gap-2">
                        <ButtonComponent
                            variant="primary"
                            size="sm"
                            onClick={() => startEdit(role)}
                        >
                            {t("common.edit")}
                        </ButtonComponent>
                        {!SEED_ROLE_KEYS.has(role.key) && (
                            <ButtonComponent
                                variant="destructive"
                                size="sm"
                                onClick={() => setConfirmDelete(role)}
                            >
                                {t("common.delete")}
                            </ButtonComponent>
                        )}
                    </div>
                ),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t],
    );

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "project_role", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <PageHeader title={t("roles.title")} subtitle="Administración" />
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" message={t("roles.loading")} />
                    </div>
                </PageContainer>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "project_role", action: "read" }} redirectTo="/mi-espacio">
            <PageContainer>
                <PageHeader
                    title={t("roles.title")}
                    subtitle="Administración"
                    description={t("roles.description")}
                    actions={
                        <RequirePermission permission={{ obj: "project_role", action: "create" }} redirect={false}>
                            <ButtonComponent variant="primary" onClick={openCreate}>
                                <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                                {t("roles.newRole")}
                            </ButtonComponent>
                        </RequirePermission>
                    }
                />
                <ListPageShell<ProjectRole>
                    title={t("roles.title")}
                    columns={columns}
                    keyField="key"
                    data={roles}
                    features={{ globalSearch: false }}
                    display={{
                        emptyMessage: t("roles.noRoles"),
                        loadingMessage: t("roles.loading"),
                    }}
                />
            </PageContainer>

            <Modal
                isOpen={isModalOpen}
                onClose={resetForm}
                title={editingKey ? t("roles.editTitle") : t("roles.newTitle")}
                footer={
                    <>
                        <ButtonComponent onClick={resetForm} variant="neutral" disabled={saving}>
                            {t("common.cancel")}
                        </ButtonComponent>
                        <ButtonComponent onClick={handleSave} variant="primary" disabled={saving}>
                            {saving ? t("common.saving") : t("common.save")}
                        </ButtonComponent>
                    </>
                }
            >
                <div className="grid gap-5">
                    <InputComponent
                        label={t("roles.name")}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={t("roles.namePlaceholder")}
                        required
                        maxLength={100}
                    />
                    <div>
                        <InputComponent
                            label={t("roles.key")}
                            value={form.key}
                            onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
                            placeholder={t("roles.keyPlaceholder")}
                            disabled={!!editingKey}
                            maxLength={40}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {editingKey ? t("roles.keyLocked") : t("roles.keyHint")}
                        </p>
                    </div>
                    <CheckboxComponent
                        variantType="toggle"
                        label={t("roles.isTeam")}
                        description={t("roles.isTeamHint")}
                        checked={form.isTeam}
                        onChange={(e) => setForm({ ...form, isTeam: e.target.checked })}
                    />
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={t("roles.confirmDeleteTitle")}
                message={confirmDelete ? t("roles.confirmDelete", { name: confirmDelete.name }) : ""}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
        </RequirePermission>
    );
}
