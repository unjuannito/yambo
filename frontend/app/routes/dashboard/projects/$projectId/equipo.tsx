import { useState } from "react";
import { useLocation, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowRightArrowLeft,
    faCheck,
    faCrown,
    faEnvelope,
    faPenToSquare,
    faPlus,
    faTrashCan,
    faUserMinus,
    faUserPlus,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { ReactNode } from "react";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import { AddPersonModal, type AddPersonPreset } from "~/components/dashboard/team/AddPersonModal";
import { GiveAccessModal } from "~/components/dashboard/team/GiveAccessModal";
import { PersonCard, type PersonAction } from "~/components/dashboard/team/PersonCard";
import { adminUserService } from "~/services/adminUserService";
import { projectService, type ProjectGroup } from "~/services/projectService";
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import type { User } from "~/types/userType";
import type { ProjectContext } from "./_layout";

type StaffRole = "MONITOR" | "COORDINATOR";

type Pending =
    | { type: "remove"; user: User; groupId: string; role: StaffRole; from: string }
    | { type: "deleteGroup"; group: ProjectGroup }
    | null;

function displayName(user: User): string {
    return user.staff?.nickname || user.name;
}

export default function ProjectTeam() {
    const { t } = useTranslation();
    const location = useLocation();
    const { project, groups, members, target, reload } = useOutletContext<ProjectContext>();
    const { hasPermission } = useAuth();
    const canAdd = hasPermission({ obj: "user", action: "create" }) || hasPermission({ obj: "user", action: "update" });
    const canAssign = hasPermission({ obj: "user", action: "update" });
    const canEditGroups = hasPermission({ obj: "project", action: "update" });
    // El backend exige `project:delete` para borrar un grupo
    const canDeleteGroups = hasPermission({ obj: "project", action: "delete" });

    const [addPreset, setAddPreset] = useState<AddPersonPreset | null>(null);
    const [accessUser, setAccessUser] = useState<User | null>(null);
    const [moving, setMoving] = useState<{ user: User; fromGroupId: string } | null>(null);
    const [pending, setPending] = useState<Pending>(null);
    const [busy, setBusy] = useState(false);

    const [newGroupName, setNewGroupName] = useState("");
    const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

    const defaultGroup = groups.find((g) => !g.name);
    const namedGroups = groups.filter((g) => g.name).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"));

    const withRole = (groupId: string | undefined, role: StaffRole) =>
        members
            .filter((u) => u.groupRoles?.some((gr) => gr.groupId === groupId && gr.role === role))
            .sort((a, b) => displayName(a).localeCompare(displayName(b), "es"));

    const coordinators = members
        .filter((u) => u.groupRoles?.some((gr) => gr.projectId === project.id && gr.role === "COORDINATOR"))
        .sort((a, b) => displayName(a).localeCompare(displayName(b), "es"));
    const looseMonitors = withRole(defaultGroup?.id, "MONITOR");

    /** Lanza una operación sobre el equipo y recarga al terminar, vaya bien o mal. */
    const run = async (operation: () => Promise<unknown>, success: string, failure: string) => {
        try {
            setBusy(true);
            await operation();
            toast.success(success);
        } catch (err) {
            toast.error(getErrorMessage(err, failure));
        } finally {
            setBusy(false);
            await reload();
        }
    };

    const makeCoordinator = (user: User) => {
        if (!target) return;
        void run(
            () => adminUserService.assignGroupRole(user.id, target.defaultGroupId, "COORDINATOR"),
            t("team.madeCoordinator", { name: displayName(user) }),
            t("staff.addError"),
        );
    };

    const moveTo = (group: ProjectGroup) => {
        if (!moving) return;
        const { user, fromGroupId } = moving;
        setMoving(null);
        void run(
            // Primero se asigna: si algo falla, la persona no se queda fuera de ambos grupos
            async () => {
                await adminUserService.assignGroupRole(user.id, group.id, "MONITOR");
                await adminUserService.removeGroupRole(user.id, fromGroupId, "MONITOR");
            },
            t("team.moved", { name: displayName(user), group: group.name || t("team.noGroup") }),
            t("team.moveError"),
        );
    };

    const confirmPending = () => {
        if (!pending) return;
        const action = pending;
        setPending(null);
        if (action.type === "remove") {
            void run(
                () => adminUserService.removeGroupRole(action.user.id, action.groupId, action.role),
                t("team.removed", { name: displayName(action.user), from: action.from }),
                t("team.removeError"),
            );
        } else {
            void run(
                () => projectService.deleteGroup(project.id, action.group.id),
                t("projects.groupDeleted"),
                t("projects.groupDeleteError"),
            );
        }
    };

    const createGroup = () => {
        const name = newGroupName.trim();
        if (!name) return;
        setNewGroupName("");
        void run(() => projectService.createGroup(project.id, name), t("projects.groupCreated"), t("projects.groupCreateError"));
    };

    const renameGroup = () => {
        if (!renaming?.name.trim()) return;
        const { id, name } = renaming;
        setRenaming(null);
        void run(() => projectService.updateGroup(project.id, id, name.trim()), t("projects.groupUpdated"), t("projects.groupUpdateError"));
    };

    const actionsFor = (user: User, role: StaffRole, groupId: string, from: string): PersonAction[] => {
        const isCoordinator = coordinators.includes(user);
        return [
            {
                key: "edit",
                label: t("staff.editCard"),
                icon: faPenToSquare,
                to: `/mi-espacio/admin/usuarios/${user.id}/perfil`,
                state: { back: location.pathname },
            },
            ...(canAssign && role === "MONITOR" && groups.length > 1
                ? [{ key: "move", label: t("team.move"), icon: faArrowRightArrowLeft, onClick: () => setMoving({ user, fromGroupId: groupId }) }]
                : []),
            ...(canAssign && role === "MONITOR" && !isCoordinator && target
                ? [{ key: "coordinator", label: t("team.makeCoordinator"), icon: faCrown, onClick: () => makeCoordinator(user) }]
                : []),
            ...(canAssign && user.hasAccount === false
                ? [{ key: "access", label: t("staff.giveAccess"), icon: faEnvelope, onClick: () => setAccessUser(user) }]
                : []),
            ...(canAssign
                ? [{
                    key: "remove",
                    label: t("team.removeFrom", { from }),
                    icon: faUserMinus,
                    danger: true,
                    onClick: () => setPending({ type: "remove", user, groupId, role, from }),
                }]
                : []),
        ];
    };

    const block = (opts: {
        key: string;
        title: ReactNode;
        accent: string;
        people: User[];
        role: StaffRole;
        groupId: string | undefined;
        from: string;
        empty: string;
        tools?: ReactNode;
    }) => (
        <section key={opts.key} aria-label={opts.from} className="rounded-2xl border border-gray-100 bg-gray-50/60">
            <header className="flex items-center gap-2 px-4 py-2.5">
                <span className={`w-1.5 h-5 rounded-full ${opts.accent}`} />
                <div className="min-w-0 flex-1 font-bold text-yambo-black">{opts.title}</div>
                <span className="text-xs text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-100">
                    {opts.people.length}
                </span>
                {opts.tools}
                {canAdd && target && (
                    <button
                        type="button"
                        onClick={() => setAddPreset({ projectId: project.id, role: opts.role, groupId: opts.role === "MONITOR" ? opts.groupId : undefined })}
                        aria-label={t("team.addTo", { to: opts.from })}
                        title={t("team.addTo", { to: opts.from })}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 text-yambo-green-600 hover:bg-yambo-green-50 hover:border-yambo-green-300 transition-colors"
                    >
                        <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                    </button>
                )}
            </header>
            <div className="px-3 pb-3">
                {opts.people.length > 0 ? (
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {opts.people.map((user) => (
                            <PersonCard
                                key={user.id}
                                user={user}
                                actions={opts.groupId ? actionsFor(user, opts.role, opts.groupId, opts.from) : []}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="px-1 py-2 text-sm text-gray-400 italic">{opts.empty}</p>
                )}
            </div>
        </section>
    );

    const iconButton = "w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white transition-colors";

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <p className="text-sm text-gray-500">{t("team.projectSummary", { count: members.length })}</p>
                {canAdd && target && (
                    <ButtonComponent variant="primary" size="sm" onClick={() => setAddPreset({ projectId: project.id })} disabled={busy}>
                        <FontAwesomeIcon icon={faUserPlus} className="mr-1.5" />
                        {t("team.addPerson")}
                    </ButtonComponent>
                )}
            </div>

            {block({
                key: "coordination",
                title: t("team.coordination"),
                accent: "bg-yambo-purple-500",
                people: coordinators,
                role: "COORDINATOR",
                groupId: defaultGroup?.id,
                from: t("team.coordination"),
                empty: t("team.noCoordinators"),
            })}

            {namedGroups.map((group) =>
                block({
                    key: group.id,
                    title:
                        renaming?.id === group.id ? (
                            <span className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={renaming.name}
                                    aria-label={t("team.renameGroup")}
                                    onChange={(e) => setRenaming({ id: group.id, name: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") renameGroup();
                                        if (e.key === "Escape") setRenaming(null);
                                    }}
                                    className="min-w-0 flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm font-normal focus:outline-none focus:border-yambo-green-500"
                                    autoFocus
                                />
                                <button type="button" onClick={renameGroup} aria-label={t("common.save")} className={`${iconButton} hover:text-yambo-green-600`}>
                                    <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => setRenaming(null)} aria-label={t("common.cancel")} className={`${iconButton} hover:text-gray-600`}>
                                    <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ) : (
                            <span className="truncate block">{group.name}</span>
                        ),
                    accent: "bg-yambo-green-500",
                    people: withRole(group.id, "MONITOR"),
                    role: "MONITOR",
                    groupId: group.id,
                    from: group.name ?? "",
                    empty: t("team.noMonitorsInGroup"),
                    tools: renaming?.id !== group.id && (
                        <>
                            {canEditGroups && (
                                <button
                                    type="button"
                                    onClick={() => setRenaming({ id: group.id, name: group.name ?? "" })}
                                    aria-label={t("team.renameGroupNamed", { name: group.name })}
                                    title={t("team.renameGroup")}
                                    className={`${iconButton} hover:text-yambo-green-600`}
                                >
                                    <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {canDeleteGroups && (
                                <button
                                    type="button"
                                    onClick={() => setPending({ type: "deleteGroup", group })}
                                    aria-label={t("team.deleteGroupNamed", { name: group.name })}
                                    title={t("team.deleteGroup")}
                                    className={`${iconButton} hover:text-red-500`}
                                >
                                    <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </>
                    ),
                }),
            )}

            {/* Sin grupos de edad, los monitores cuelgan directamente del proyecto */}
            {(namedGroups.length === 0 || looseMonitors.length > 0) &&
                block({
                    key: "loose",
                    title: namedGroups.length === 0 ? t("staff.monitors") : t("team.monitorsWithoutGroup"),
                    accent: namedGroups.length === 0 ? "bg-yambo-green-500" : "bg-gray-300",
                    people: looseMonitors,
                    role: "MONITOR",
                    groupId: defaultGroup?.id,
                    from: namedGroups.length === 0 ? project.name : t("team.monitorsWithoutGroup"),
                    empty: t("team.noMonitors"),
                })}

            {canEditGroups && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        createGroup();
                    }}
                    className="flex gap-2 rounded-2xl border border-dashed border-gray-200 p-2"
                >
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={t("team.newGroupPlaceholder")}
                        aria-label={t("team.newGroup")}
                        maxLength={100}
                        className="min-w-0 flex-1 bg-transparent px-2 text-sm focus:outline-none"
                    />
                    <ButtonComponent type="submit" variant="neutral" size="sm" disabled={busy || !newGroupName.trim()}>
                        <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                        {t("team.newGroup")}
                    </ButtonComponent>
                </form>
            )}

            <AddPersonModal
                isOpen={addPreset !== null}
                onClose={() => setAddPreset(null)}
                onDone={reload}
                targets={target ? [target] : []}
                fixedProject
                preset={addPreset ?? undefined}
            />

            <GiveAccessModal user={accessUser} onClose={() => setAccessUser(null)} onDone={reload} />

            <Modal
                isOpen={moving !== null}
                onClose={() => setMoving(null)}
                title={t("team.moveTitle", { name: moving ? displayName(moving.user) : "" })}
                size="sm"
            >
                <div className="flex flex-col gap-2">
                    {groups
                        .filter((g) => g.id !== moving?.fromGroupId)
                        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "es"))
                        .map((group) => (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => moveTo(group)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-left text-sm font-medium hover:border-yambo-green-300 hover:bg-yambo-green-50/50 transition-all"
                            >
                                <span className={`w-1.5 h-5 rounded-full ${group.name ? "bg-yambo-green-500" : "bg-gray-300"}`} />
                                {group.name || t("team.noGroup")}
                            </button>
                        ))}
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={pending !== null}
                onClose={() => setPending(null)}
                onConfirm={confirmPending}
                title={pending?.type === "deleteGroup" ? t("team.deleteGroup") : t("team.removeTitle")}
                message={
                    pending?.type === "deleteGroup"
                        ? t("projects.confirmDeleteGroup", { name: pending.group.name })
                        : pending
                            ? t("team.removeConfirm", { name: displayName(pending.user), from: pending.from })
                            : ""
                }
                confirmLabel={pending?.type === "deleteGroup" ? t("common.delete") : t("team.remove")}
                variant="danger"
            />
        </div>
    );
}
