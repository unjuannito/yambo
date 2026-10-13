import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import type { User } from "~/types/userType";
import type { GroupRole } from "~/types/role";
import { RequirePermission } from "~/components/common/RequirePermission";
import { adminUserService } from "~/services/adminUserService";
import { loadAssignableGroupOptions } from "~/utils/groupOptions";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import ElephantAvatar from "~/components/ElephantAvatar";
import { getErrorMessage } from "~/types/error";
import { projectColor } from "~/utils/projectColor";
import toast from "react-hot-toast";
import { PageContainer } from "~/components/common/PageContainer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPenToSquare, faPlus, faUserPlus, faEnvelope } from "@fortawesome/free-solid-svg-icons";

type StatusFilter = "all" | "noAccount" | "incomplete";

interface NewPersonForm {
    name: string;
    nickname: string;
    email: string;
    groupId: string;
    role: GroupRole;
}

const EMPTY_NEW_PERSON: NewPersonForm = { name: "", nickname: "", email: "", groupId: "", role: "MONITOR" };

const selectClass =
    "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500";

/** Roles de staff de una persona (los de padre no cuentan para el equipo). */
function staffRoles(user: User) {
    return (user.groupRoles ?? []).filter((gr) => gr.role === "MONITOR" || gr.role === "COORDINATOR");
}

function isIncomplete(user: User): boolean {
    return !user.staff?.bio;
}

export default function StaffDirectory() {
    const { t } = useTranslation();
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);

    const [view, setView] = useState<"cards" | "grouped">("cards");
    const [search, setSearch] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const [saving, setSaving] = useState(false);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [newPerson, setNewPerson] = useState<NewPersonForm>({ ...EMPTY_NEW_PERSON });
    const [accessUser, setAccessUser] = useState<User | null>(null);
    const [accessEmail, setAccessEmail] = useState("");

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [addGroupId, setAddGroupId] = useState("");
    const [addRole, setAddRole] = useState<GroupRole>("MONITOR");

    useEffect(() => {
        loadAssignableGroupOptions()
            .then(setGroupOptions)
            .catch((err) => toast.error(getErrorMessage(err, t("users.groupsLoadError"))));
    }, []);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const res = await adminUserService.listUsers({ staff: true, page: 0, size: 500 });
                setStaff(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, t("staff.loadError")));
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, [refreshKey]);

    const projects = useMemo(() => {
        const names = new Map<string, string>();
        staff.forEach((u) => staffRoles(u).forEach((gr) => names.set(gr.projectId, gr.projectName)));
        return [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [staff]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return staff
            .filter((u) => {
                if (q && !`${u.name} ${u.staff?.nickname ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q)) return false;
                if (projectFilter && !staffRoles(u).some((gr) => gr.projectId === projectFilter)) return false;
                if (statusFilter === "noAccount" && u.hasAccount !== false) return false;
                if (statusFilter === "incomplete" && !isIncomplete(u)) return false;
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [staff, search, projectFilter, statusFilter]);

    const counts = useMemo(() => ({
        total: staff.length,
        noAccount: staff.filter((u) => u.hasAccount === false).length,
        incomplete: staff.filter(isIncomplete).length,
    }), [staff]);

    const byProject = useMemo(() => {
        const map = new Map<string, { name: string; coordinators: User[]; monitors: User[] }>();
        const manual: User[] = [];
        for (const user of filtered) {
            const roles = staffRoles(user);
            if (roles.length === 0) {
                manual.push(user);
                continue;
            }
            for (const gr of roles) {
                if (!map.has(gr.projectId)) map.set(gr.projectId, { name: gr.projectName, coordinators: [], monitors: [] });
                const bucket = gr.role === "COORDINATOR" ? map.get(gr.projectId)!.coordinators : map.get(gr.projectId)!.monitors;
                if (!bucket.includes(user)) bucket.push(user);
            }
        }
        return { projects: [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)), manual };
    }, [filtered]);

    // ── Nueva persona (sin cuenta) ──────────────────────────────────────
    const closeNew = () => {
        setIsNewOpen(false);
        setNewPerson({ ...EMPTY_NEW_PERSON });
    };

    const handleCreate = async () => {
        try {
            setSaving(true);
            await adminUserService.createStaff({
                name: newPerson.name.trim(),
                nickname: newPerson.nickname.trim() || undefined,
                email: newPerson.email.trim() || undefined,
                groupId: newPerson.groupId || undefined,
                role: newPerson.groupId ? newPerson.role : undefined,
            });
            toast.success(t("staff.personCreated", { name: newPerson.name.trim() }));
            closeNew();
            setRefreshKey((k) => k + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.personCreateError")));
        } finally {
            setSaving(false);
        }
    };

    // ── Dar acceso ──────────────────────────────────────────────────────
    const openAccess = (user: User) => {
        setAccessUser(user);
        setAccessEmail(user.email ?? "");
    };

    const handleGiveAccess = async () => {
        if (!accessUser) return;
        try {
            setSaving(true);
            await adminUserService.giveAccountAccess(accessUser.id, accessEmail.trim());
            toast.success(t("staff.accessSent", { email: accessEmail.trim() }));
            setAccessUser(null);
            setRefreshKey((k) => k + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.accessError")));
        } finally {
            setSaving(false);
        }
    };

    // ── Añadir a alguien que ya tiene usuario ───────────────────────────
    const resetAdd = () => {
        setIsAddOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setAddGroupId("");
        setAddRole("MONITOR");
    };

    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (!trimmed) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await adminUserService.listUsers({ query: trimmed, page: 0, size: 10 });
                setSearchResults(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, t("staff.usersLoadError")));
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddSave = async () => {
        if (!selectedUser || !addGroupId) {
            toast.error(t("staff.selectUserAndGroup"));
            return;
        }
        try {
            setSaving(true);
            await adminUserService.assignGroupRole(selectedUser.id, addGroupId, addRole);
            const roleLabel = addRole === "COORDINATOR" ? t("users.roleCoordinator") : t("users.roleMonitor");
            toast.success(t("staff.addedAs", { name: selectedUser.name, role: roleLabel }));
            resetAdd();
            setRefreshKey((k) => k + 1);
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.addError")));
        } finally {
            setSaving(false);
        }
    };

    const renderCard = (user: User) => {
        const roles = staffRoles(user);
        const displayName = user.staff?.nickname || user.name;
        return (
            <div key={user.id} className="flex flex-col rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                <div className="relative w-full h-40 overflow-hidden">
                    {user.staff?.photo ? (
                        <img src={user.staff.photo} alt={displayName} className="w-full h-full object-cover" style={{ objectPosition: "center top" }} />
                    ) : (
                        <ElephantAvatar seed={user.id} config={user.staff?.avatar} title={displayName} className="block" />
                    )}
                    {user.hasAccount === false && (
                        <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yambo-black/80 text-white">
                            {t("staff.noAccount")}
                        </span>
                    )}
                </div>
                <div className="flex-1 p-3">
                    <h3 className="text-base font-bold text-yambo-black truncate">{displayName}</h3>
                    {user.staff?.nickname && <p className="text-xs text-gray-400 truncate">{user.name}</p>}
                    <p className="text-xs text-gray-400 truncate">{user.email || t("staff.noEmail")}</p>

                    <div className="mt-2 flex flex-wrap gap-1">
                        {roles.length === 0 && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t("staff.addedByHand")}</span>
                        )}
                        {roles.map((gr) => {
                            const { bg, text } = projectColor(gr.projectName + (gr.groupName || ""));
                            return (
                                <span
                                    key={`${gr.groupId}-${gr.role}`}
                                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: bg, color: text }}
                                    title={gr.role === "COORDINATOR" ? t("users.roleCoordinator") : t("users.roleMonitor")}
                                >
                                    {gr.role === "COORDINATOR" ? "C" : "M"}: {gr.groupName || gr.projectName}
                                </span>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                        {isIncomplete(user) && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {t("staff.missingBio")}
                            </span>
                        )}
                        {user.staff?.photo && !user.staff.photoConsent && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yambo-purple-50 text-yambo-purple-700 border border-yambo-purple-100">
                                {t("staff.photoWithoutConsent")}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col gap-2 px-3 pb-3">
                    <Link
                        to={`/mi-espacio/admin/usuarios/${user.id}/perfil`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border border-gray-200 text-yambo-green-600 hover:bg-yambo-green-50 hover:border-yambo-green-400 transition-colors"
                    >
                        <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                        {t("staff.editCard")}
                    </Link>
                    {user.hasAccount === false && (
                        <button
                            type="button"
                            onClick={() => openAccess(user)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap bg-yambo-black text-white hover:bg-yambo-black/85 transition-colors"
                        >
                            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                            {t("staff.giveAccess")}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const grid = (users: User[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">{users.map(renderCard)}</div>
    );

    return (
        <RequirePermission permission={{ obj: "user", action: "read" }}>
            <PageContainer>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold font-display text-yambo-black">{t("staff.title")}</h1>
                        <p className="text-gray-500 mt-1">
                            {t("staff.summary", { total: counts.total, noAccount: counts.noAccount, incomplete: counts.incomplete })}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-full border border-gray-200 overflow-hidden">
                            {(["cards", "grouped"] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setView(v)}
                                    className={`px-4 py-1.5 text-sm font-medium transition-all ${
                                        view === v
                                            ? "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white"
                                            : "bg-white text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    {v === "cards" ? t("staff.viewAll") : t("staff.viewByProject")}
                                </button>
                            ))}
                        </div>
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <ButtonComponent variant="neutral" onClick={() => setIsAddOpen(true)}>
                                <FontAwesomeIcon icon={faUserPlus} className="mr-1.5" />
                                {t("staff.addExisting")}
                            </ButtonComponent>
                        </RequirePermission>
                        <RequirePermission permission={{ obj: "user", action: "create" }} redirect={false}>
                            <ButtonComponent variant="primary" onClick={() => setIsNewOpen(true)}>
                                <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                                {t("staff.newPerson")}
                            </ButtonComponent>
                        </RequirePermission>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("staff.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 outline-none bg-white shadow-sm transition-all"
                        />
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        aria-label={t("staff.projectFilter")}
                        className="border border-gray-200 rounded-full px-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-300"
                    >
                        <option value="">{t("staff.allProjects")}</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                        {(["all", "noAccount", "incomplete"] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatusFilter(s)}
                                aria-pressed={statusFilter === s}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                                    statusFilter === s
                                        ? "bg-yambo-black text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                {t(`staff.status.${s}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p className="text-gray-400 text-center py-12">{t("staff.loading")}</p>
                ) : filtered.length === 0 ? (
                    <p className="text-gray-400 text-center py-12">{t("staff.empty")}</p>
                ) : view === "cards" ? (
                    grid(filtered)
                ) : (
                    <div className="space-y-8">
                        {byProject.projects.map(([projectId, project]) => (
                            <section key={projectId}>
                                <h2 className="text-xl font-bold font-display text-yambo-black mb-3">{project.name}</h2>
                                {project.coordinators.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-yambo-purple-700 mb-2">{t("staff.coordinators")}</h3>
                                        {grid(project.coordinators)}
                                    </div>
                                )}
                                {project.monitors.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-yambo-green-600 mb-2">{t("staff.monitors")}</h3>
                                        {grid(project.monitors)}
                                    </div>
                                )}
                            </section>
                        ))}
                        {byProject.manual.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold font-display text-yambo-black mb-3">{t("staff.withoutProject")}</h2>
                                {grid(byProject.manual)}
                            </section>
                        )}
                    </div>
                )}

                {/* Nueva persona */}
                <Modal
                    isOpen={isNewOpen}
                    onClose={closeNew}
                    title={t("staff.newPerson")}
                    size="md"
                    footer={
                        <>
                            <ButtonComponent onClick={closeNew} variant="secondary" disabled={saving}>
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent onClick={handleCreate} variant="primary" disabled={saving || newPerson.name.trim().length < 2}>
                                {saving ? t("common.saving") : t("staff.createPerson")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-500 bg-yambo-green-50 border border-yambo-green-100 rounded-xl px-4 py-2.5">
                            {t("staff.newPersonHint")}
                        </p>
                        <InputComponent
                            label={t("staff.personName")}
                            value={newPerson.name}
                            onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                            maxLength={100}
                            required
                        />
                        <InputComponent
                            label={t("users.nickname")}
                            value={newPerson.nickname}
                            onChange={(e) => setNewPerson({ ...newPerson, nickname: e.target.value })}
                            maxLength={50}
                            placeholder={t("users.nicknamePlaceholder")}
                        />
                        <InputComponent
                            label={t("staff.emailOptional")}
                            type="email"
                            value={newPerson.email}
                            onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                            placeholder={t("staff.emailOptionalPlaceholder")}
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.groupOptional")}</label>
                                <select
                                    value={newPerson.groupId}
                                    onChange={(e) => setNewPerson({ ...newPerson, groupId: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">{t("staff.noGroupYet")}</option>
                                    {groupOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.roleLabel")}</label>
                                <select
                                    value={newPerson.role}
                                    onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value as GroupRole })}
                                    disabled={!newPerson.groupId}
                                    className={`${selectClass} disabled:bg-gray-50 disabled:text-gray-400`}
                                >
                                    <option value="MONITOR">{t("users.roleMonitor")}</option>
                                    <option value="COORDINATOR">{t("users.roleCoordinator")}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Dar acceso */}
                <Modal
                    isOpen={accessUser !== null}
                    onClose={() => setAccessUser(null)}
                    title={t("staff.giveAccessTitle", { name: accessUser?.name ?? "" })}
                    size="sm"
                    footer={
                        <>
                            <ButtonComponent onClick={() => setAccessUser(null)} variant="secondary" disabled={saving}>
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent onClick={handleGiveAccess} variant="primary" disabled={saving || !accessEmail.trim()}>
                                {saving ? t("staff.sending") : t("staff.sendAccess")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-500">{t("staff.giveAccessHint")}</p>
                        <InputComponent
                            label={t("users.email")}
                            type="email"
                            value={accessEmail}
                            onChange={(e) => setAccessEmail(e.target.value)}
                            placeholder="nombre@correo.com"
                            required
                        />
                    </div>
                </Modal>

                {/* Añadir a alguien que ya tiene usuario */}
                <Modal
                    isOpen={isAddOpen}
                    onClose={resetAdd}
                    title={t("staff.addToStaff")}
                    size="md"
                    footer={
                        <>
                            <ButtonComponent onClick={resetAdd} variant="secondary" disabled={saving}>
                                {t("common.cancel")}
                            </ButtonComponent>
                            <ButtonComponent onClick={handleAddSave} variant="primary" disabled={saving || !selectedUser || !addGroupId}>
                                {saving ? t("staff.adding") : t("staff.add")}
                            </ButtonComponent>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.searchUser")}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("staff.searchUserPlaceholder")}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500"
                                />
                                {searching && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{t("staff.searching")}</span>
                                )}
                            </div>
                        </div>

                        {searchResults.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.selectUser")}</label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y">
                                    {searchResults.map((user) => (
                                        <button
                                            type="button"
                                            key={user.id}
                                            onClick={() => setSelectedUser(user)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-yambo-green-50/30 transition-colors ${
                                                selectedUser?.id === user.id ? "bg-yambo-green-50" : ""
                                            }`}
                                        >
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-gray-400 text-xs ml-auto">{user.email}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedUser && (
                            <>
                                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl px-3 py-2 text-sm">
                                    {t("staff.selected")}: <strong>{selectedUser.name}</strong>
                                    {selectedUser.email && <> ({selectedUser.email})</>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.groupField")}</label>
                                    <select value={addGroupId} onChange={(e) => setAddGroupId(e.target.value)} className={selectClass}>
                                        <option value="">{t("users.selectGroup")}</option>
                                        {groupOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("staff.roleField")}</label>
                                    <select value={addRole} onChange={(e) => setAddRole(e.target.value as GroupRole)} className={selectClass}>
                                        <option value="MONITOR">{t("users.roleMonitor")}</option>
                                        <option value="COORDINATOR">{t("users.roleCoordinator")}</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            </PageContainer>
        </RequirePermission>
    );
}
