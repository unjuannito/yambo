import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/index";
import type { User } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { RequirePermission } from "~/components/common/RequirePermission";
import { FilterableTable } from "~/components/common/FilterableTable";
import type { FilterableColumn, FetchDataParams } from "~/components/common/FilterableTable";
import { adminUserService } from "~/services/adminUserService";
import { profileService } from "~/services/profileService";
import { loadAssignableGroupOptions } from "~/utils/groupOptions";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import InputComponent from "~/components/common/forms/InputComponent";
import MultiSelectComponent from "~/components/common/forms/MultiSelectComponent";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import { getErrorMessage } from "~/types/error";
import { isStaff } from "~/utils/roleHelpers";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faArrowRight, faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Usuarios" },
        { name: "Yambo - Usuarios", content: "Yambo - Usuarios" },
    ];
}

interface GroupRoleEntry {
    groupId: string;
    role: GroupRole;
}

interface UserForm {
    userId: string;
    name: string;
    email: string;
    profileIds: string[];
    groupRoles: GroupRoleEntry[];
    manualStaff: boolean;
    photo: string;
    bio: string;
    funFact: string;
}

const EMPTY_FORM: UserForm = {
    userId: "",
    name: "",
    email: "",
    profileIds: [],
    groupRoles: [],
    manualStaff: false,
    photo: "",
    bio: "",
    funFact: "",
};

export default function Users() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [profileOptions, setProfileOptions] = useState<{ value: string; label: string }[]>([]);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<UserForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const profiles = await profileService.getAllProfiles();
                const options = profiles.map(profile => ({
                    value: profile.id,
                    label: profile.name,
                }));
                setProfileOptions(options);
            } catch (err) {
                toast.error(getErrorMessage(err, t('users.profilesLoadError')));
            }
        };
        const fetchGroups = async () => {
            try {
                setGroupOptions(await loadAssignableGroupOptions());
            } catch (err) {
                toast.error(getErrorMessage(err, t('users.groupsLoadError')));
            }
        };
        fetchProfiles();
        fetchGroups();
    }, []);

    const fetchUsersData = useCallback(async ({ page, size, filters }: FetchDataParams) => {
        return await adminUserService.listUsers({
            query: filters.q,
            profiles: filters.profiles,
            enabled: filters.enabled,
            page,
            size,
        });
    }, [refreshKey]);

    const startEdit = (user: User) => {
        setEditing(user.id);
        setForm({
            userId: user.id,
            name: user.name,
            email: user.email,
            profileIds: user.profiles.map(p => p.id),
            groupRoles: user.groupRoles?.map(gr => ({ groupId: gr.groupId, role: gr.role })) || [],
            manualStaff: user.staff?.manual ?? false,
            photo: user.staff?.photo || "",
            bio: user.staff?.bio || "",
            funFact: user.staff?.funFact || "",
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
        setSaving(false);
    };

    const formIsStaff = form.manualStaff || isStaff({ groupRoles: form.groupRoles });

    const handleSave = async () => {
        if (form.profileIds.length === 0) {
            toast.error(t('users.selectProfileError'));
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await adminUserService.updateUserProfiles(editing, form.profileIds);
                await adminUserService.updateUserDetails({
                    id: editing,
                    name: form.name,
                    email: form.email,
                });

                // Sync group roles: get current, compute diff, apply
                const currentRoles = await adminUserService.getUserGroupRoles(editing);
                const currentKey = (gr: { groupId: string; role: string }) => `${gr.groupId}:${gr.role}`;
                const currentSet = new Set(currentRoles.map(currentKey));
                const desiredSet = new Set(form.groupRoles.map(gr => `${gr.groupId}:${gr.role}`));

                // Remove roles no longer desired
                for (const cr of currentRoles) {
                    if (!desiredSet.has(currentKey(cr))) {
                        await adminUserService.removeGroupRole(editing, cr.groupId, cr.role as GroupRole);
                    }
                }
                // Add new roles
                for (const gr of form.groupRoles) {
                    if (!currentSet.has(`${gr.groupId}:${gr.role}`)) {
                        await adminUserService.assignGroupRole(editing, gr.groupId, gr.role);
                    }
                }

                // Staff data goes last: a role added above may be what makes the user staff
                if (formIsStaff) {
                    await adminUserService.updateStaff(editing, {
                        photo: form.photo,
                        bio: form.bio,
                        funFact: form.funFact,
                    });
                }

                toast.success(t('users.userUpdated'));
            }
            resetForm();
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.userUpdateError')));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (userId: string, userName: string) => {
        setConfirmDelete({ id: userId, name: userName });
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await adminUserService.deleteUser(confirmDelete.id);
            toast.success(t('users.userDeletedOk'));
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t('users.userDeleteError')));
        } finally {
            setConfirmDelete(null);
        }
    };

    const userTableColumns: FilterableColumn<User>[] = [
        {
            key: "id",
            header: "ID",
            className: "hidden md:table-cell",
            filter: {
                enabled: true,
                type: "search",
                placeholder: t('users.searchById'),
            },
            render: (user: User) => (
                <span className="font-mono text-xs">{user.id}</span>
            ),
        },
        {
            key: "name",
            header: t('common.name'),
            filter: {
                enabled: true,
                type: "search",
                placeholder: t('users.searchByName'),
            },
            render: (user: User) => (
                <div>
                    <button type="button"
                        onClick={() => navigate(`/mi-espacio/admin/usuarios/${user.id}/perfil`)}
                        className="font-medium text-yambo-black hover:text-yambo-green-600 transition-colors text-left"
                    >
                        {user.name}
                    </button>
                    {user.system && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-normal">
                            {t('users.systemBadge')}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "email",
            header: t('users.emailHeader'),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "search",
                placeholder: t('users.searchByEmail'),
            },
        },
        {
            key: "profiles",
            header: t('users.profiles'),
            filter: {
                enabled: true,
                type: "multi-select",
                placeholder: t('users.selectProfiles'),
                options: profileOptions,
            },
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                    {user.profiles.length > 0 ? (
                        user.profiles
                            .slice(0, 3)
                            .map((profile) => (
                                <span
                                    key={profile.id}
                                    className="px-2 py-1 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs"
                                >
                                    {profile.name}
                                </span>
                            ))
                    ) : (
                        <span className="text-gray-400 text-xs italic">
                            {t('users.noPermissions')}
                        </span>
                    )}
                    {user.profiles.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{user.profiles.length - 3} más
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "groupRoles",
            header: t('users.rolesGroups'),
            className: "hidden lg:table-cell",
            render: (user: User) => (
                <div className="flex flex-wrap gap-1">
                    {user.groupRoles && user.groupRoles.length > 0 ? (
                        user.groupRoles.slice(0, 3).map((gr) => (
                            <span
                                key={`${gr.groupId}:${gr.role}`}
                                className={`px-2 py-1 rounded-full text-xs ${
                                    gr.role === 'COORDINATOR'
                                        ? 'bg-yambo-purple-100 text-yambo-purple-800'
                                        : gr.role === 'PARENT'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-yambo-green-50 text-yambo-green-700'
                                }`}
                                title={`${gr.role} - ${gr.projectName}`}
                            >
                                {gr.role === 'COORDINATOR' ? 'C' : gr.role === 'PARENT' ? 'P' : 'M'}: {gr.groupName || gr.projectName}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-400 text-xs italic">{t('users.noRoles')}</span>
                    )}
                    {user.groupRoles && user.groupRoles.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{user.groupRoles.length - 3} más
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "createdAt",
            header: t('users.createdAt'),
            className: "hidden md:table-cell",
            render: (user: User) => (
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            ),
        },
        {
            key: "enabled",
            header: t('users.enabled'),
            className: "hidden sm:table-cell",
            filter: {
                enabled: true,
                type: "checkbox",
            },
            render: (user: User) => (
                <input
                    type="checkbox"
                    checked={user.enabled}
                    disabled
                    className="rounded border-gray-300 text-yambo-green-600"
                />
            ),
        },
        {
            key: "actions",
            header: t('users.actions'),
            requiredPerms: [{ obj: "user", action: "update" }],
            render: (user: User) => (
                <div className="flex gap-2">
                    <ButtonComponent
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/mi-espacio/admin/usuarios/${user.id}/perfil`)}
                    >
                        <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5 mr-1" />
                        {t('users.manage')}
                    </ButtonComponent>
                    <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                        <ButtonComponent
                            onClick={() => startEdit(user)}
                            variant="neutral"
                            size="sm"
                        >
                            <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                        </ButtonComponent>
                    </RequirePermission>
                    {!user.system && (
                        <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                            <ButtonComponent
                                onClick={() => handleDelete(user.id, user.name)}
                                variant="destructive"
                                size="sm"
                            >
                                <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                            </ButtonComponent>
                        </RequirePermission>
                    )}
                </div>
            ),
        }
    ];

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }} redirectTo="/mi-espacio">
            <ListPageShell<User>
                title={
                    <span className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="text-yambo-green-500" />
                        {t('users.title')}
                    </span>
                }
                columns={userTableColumns}
                keyField="id"
                display={{
                    emptyMessage: t('users.empty'),
                    loadingMessage: t('users.loading'),
                    renderMobileCard: (user: User) => (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="font-medium text-yambo-black truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                                {user.system && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs shrink-0">
                                        {t('users.systemBadge')}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {user.profiles.length > 0 ? (
                                    <>
                                        {user.profiles.slice(0, 3).map((profile) => (
                                            <span
                                                key={profile.id}
                                                className="px-2 py-1 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs"
                                            >
                                                {profile.name}
                                            </span>
                                        ))}
                                        {user.profiles.length > 3 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                                +{user.profiles.length - 3} más
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-gray-400 text-xs italic">
                                        {t('users.noPermissions')}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <ButtonComponent
                                    variant="primary"
                                    size="sm"
                                    onClick={() => navigate(`/mi-espacio/admin/usuarios/${user.id}/perfil`)}
                                >
                                    <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5 mr-1" />
                                    {t('users.manage')}
                                </ButtonComponent>
                                <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                                    <ButtonComponent
                                        onClick={() => startEdit(user)}
                                        variant="neutral"
                                        size="sm"
                                    >
                                        <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                                    </ButtonComponent>
                                </RequirePermission>
                                {!user.system && (
                                    <RequirePermission permission={{ obj: "user", action: "delete" }} redirect={false}>
                                        <ButtonComponent
                                            onClick={() => handleDelete(user.id, user.name)}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                                        </ButtonComponent>
                                    </RequirePermission>
                                )}
                            </div>
                        </div>
                    ),
                }}
                features={{ globalSearch: true }}
                serverSide={{ fetchData: fetchUsersData }}
            />
            <Modal
                isOpen={isModalOpen}
                onClose={resetForm}
                title={t('users.editUser')}
                    size="md"
                    footer={
                        <>
                            <ButtonComponent
                                onClick={resetForm}
                                variant="neutral"
                                disabled={saving}
                            >
                                {t('common.cancel')}
                            </ButtonComponent>
                            <ButtonComponent
                                onClick={handleSave}
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? t('common.saving') : t('common.save')}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <InputComponent
                            label={t('common.name')}
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            minLength={2}
                            maxLength={100}
                        />
                        <InputComponent
                            label={t('users.email')}
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                        <div className="relative">
                            <label htmlFor="user-profiles" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('users.profilesField')}
                            </label>
                            <MultiSelectComponent
                                options={profileOptions}
                                value={form.profileIds}
                                placeholder={t('users.selectProfiles')}
                                required
                                name="profileIds"
                                onChange={(e) => {
                                    const selectedValues = Array.from(
                                        (e.target as HTMLSelectElement).selectedOptions,
                                        option => option.value
                                    );
                                    setForm({ ...form, profileIds: selectedValues });
                                }}
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="user-group-roles" className="block text-sm font-medium text-gray-700 mb-1">
                                {t('users.groupRoles')}
                            </label>
                            {form.groupRoles.map((gr, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                    <select
                                        value={gr.groupId}
                                        onChange={(e) => {
                                            const updated = [...form.groupRoles];
                                            updated[idx] = { ...updated[idx], groupId: e.target.value };
                                            setForm({ ...form, groupRoles: updated });
                                        }}
                                        className="flex-1 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                    >
                                        <option value="">{t('users.selectGroup')}</option>
                                        {groupOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={gr.role}
                                        onChange={(e) => {
                                            const updated = [...form.groupRoles];
                                            updated[idx] = { ...updated[idx], role: e.target.value as GroupRole };
                                            setForm({ ...form, groupRoles: updated });
                                        }}
                                        className="w-36 border border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                    >
                                        <option value="MONITOR">{t('users.roleMonitor')}</option>
                                        <option value="COORDINATOR">{t('users.roleCoordinator')}</option>
                                        <option value="PARENT">{t('users.roleParent')}</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = form.groupRoles.filter((_, i) => i !== idx);
                                            setForm({ ...form, groupRoles: updated });
                                        }}
                                        className="text-coral hover:text-coral/80 text-sm px-2"
                                    >
                                        x
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setForm({
                                    ...form,
                                    groupRoles: [...form.groupRoles, { groupId: "", role: "MONITOR" }]
                                })}
                                className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-medium mt-1"
                            >
                                + Añadir rol en grupo
                            </button>
                        </div>
                        {formIsStaff && (
                            <>
                                <InputComponent
                                    label={t('users.photoUrl')}
                                    name="photo"
                                    type="url"
                                    value={form.photo}
                                    onChange={(e) => setForm({ ...form, photo: e.target.value })}
                                />
                                <div>
                                    <label htmlFor="user-bio" className="block text-sm font-medium text-gray-700 mb-1">{t('users.bio')}</label>
                                    <textarea
                                        id="user-bio"
                                        name="bio"
                                        value={form.bio}
                                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                                        placeholder={t('users.bioUserPlaceholder')}
                                        rows={3}
                                        maxLength={500}
                                        className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.funFact')}</label>
                                    <input
                                        name="funFact"
                                        type="text"
                                        value={form.funFact}
                                        onChange={(e) => setForm({ ...form, funFact: e.target.value })}
                                        placeholder={t('users.funFactUserPlaceholder')}
                                        maxLength={100}
                                        className="w-full border border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-yambo-green-500 focus:ring-1 focus:ring-yambo-green-500/50"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={t('users.deleteUser')}
                message={confirmDelete ? t('users.deleteUserConfirm', { name: confirmDelete.name }) : ""}
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </RequirePermission>
    );
}