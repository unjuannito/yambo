import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faLink, faMagnifyingGlass, faUserCheck, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "~/components/common/Modal";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import InputComponent from "~/components/common/forms/InputComponent";
import SelectComponent from "~/components/common/forms/SelectComponent";
import { adminUserService } from "~/services/adminUserService";
import { projectRoleInvitationService } from "~/services/projectRoleInvitationService";
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import type { AssignTarget } from "~/utils/groupOptions";
import type { User } from "~/types/userType";
import { useUserSearch } from "./useUserSearch";

type StaffRole = "MONITOR" | "COORDINATOR";
type Mode = "new" | "existing" | "invite";

export interface AddPersonPreset {
    projectId?: string;
    groupId?: string;
    role?: StaffRole;
}

interface AddPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Se llama cuando cambia el equipo (alta o asignación), para recargar. */
    onDone: () => void;
    /** Proyectos entre los que elegir. Con uno solo y `fixedProject`, el proyecto no se pregunta. */
    targets: AssignTarget[];
    fixedProject?: boolean;
    preset?: AddPersonPreset;
}

const MODE_ICONS = { new: faUserPlus, existing: faUserCheck, invite: faLink } as const;

/**
 * Único punto de entrada para sumar a alguien al equipo: darlo de alta sin cuenta,
 * asignar a quien ya tiene usuario o generar un enlace de invitación al proyecto.
 */
export function AddPersonModal({ isOpen, onClose, onDone, targets, fixedProject = false, preset }: AddPersonModalProps) {
    const { t } = useTranslation();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission({ obj: "user", action: "create" });
    const canAssign = hasPermission({ obj: "user", action: "update" });
    const canInvite = hasPermission({ obj: "invitation", action: "create" });

    const modes: Mode[] = [
        ...(canCreate ? (["new"] as const) : []),
        ...(canAssign ? (["existing"] as const) : []),
        ...(canInvite ? (["invite"] as const) : []),
    ];

    const [mode, setMode] = useState<Mode>("new");
    const [projectId, setProjectId] = useState("");
    const [groupId, setGroupId] = useState("");
    const [role, setRole] = useState<StaffRole>("MONITOR");
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");

    const [query, setQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { results, searching } = useUserSearch(mode === "existing" ? query : "");

    const [inviteMaxUses, setInviteMaxUses] = useState("");
    const [inviteExpiresAt, setInviteExpiresAt] = useState("");
    const [inviteUrl, setInviteUrl] = useState("");

    // Cada apertura parte de cero, con lo que venga prefijado desde el botón pulsado
    useEffect(() => {
        if (!isOpen) return;
        setMode(modes[0] ?? "new");
        setProjectId(preset?.projectId ?? (fixedProject ? targets[0]?.projectId ?? "" : ""));
        setGroupId(preset?.groupId ?? "");
        setRole(preset?.role ?? "MONITOR");
        setName("");
        setNickname("");
        setEmail("");
        setQuery("");
        setSelectedUser(null);
        setInviteMaxUses("");
        setInviteExpiresAt("");
        setInviteUrl("");
    }, [isOpen]);

    const target = targets.find((p) => p.projectId === projectId);
    // Los coordinadores lo son del proyecto entero: siempre van al grupo de proyecto
    const resolvedGroupId = target
        ? role === "COORDINATOR"
            ? target.defaultGroupId
            : groupId || target.defaultGroupId
        : "";
    const roleName = role === "COORDINATOR" ? t("users.roleCoordinator") : t("users.roleMonitor");

    const handleCreate = async () => {
        try {
            setSaving(true);
            await adminUserService.createStaff({
                name: name.trim(),
                nickname: nickname.trim() || undefined,
                email: email.trim() || undefined,
                groupId: resolvedGroupId || undefined,
                role: resolvedGroupId ? role : undefined,
            });
            toast.success(t("staff.personCreated", { name: name.trim() }));
            onDone();
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.personCreateError")));
        } finally {
            setSaving(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedUser || !resolvedGroupId) return;
        try {
            setSaving(true);
            await adminUserService.assignGroupRole(selectedUser.id, resolvedGroupId, role);
            toast.success(t("staff.addedAs", { name: selectedUser.name, role: roleName }));
            onDone();
            onClose();
        } catch (err) {
            toast.error(getErrorMessage(err, t("staff.addError")));
        } finally {
            setSaving(false);
        }
    };

    const handleInvite = async () => {
        if (!target) return;
        try {
            setSaving(true);
            const result = await projectRoleInvitationService.createInvitation({
                projectId: target.projectId,
                role,
                maxUses: inviteMaxUses ? Number(inviteMaxUses) : undefined,
                expiresAt: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : undefined,
            });
            setInviteUrl(result.invitationLink);
        } catch (err) {
            toast.error(getErrorMessage(err, t("team.inviteError")));
        } finally {
            setSaving(false);
        }
    };

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success(t("team.inviteCopied"));
        } catch {
            toast.error(t("team.inviteCopyError"));
        }
    };

    const submit = {
        new: { label: t("staff.createPerson"), run: handleCreate, ready: name.trim().length >= 2 },
        existing: { label: t("staff.add"), run: handleAssign, ready: !!selectedUser && !!resolvedGroupId },
        invite: { label: t("team.inviteGenerate"), run: handleInvite, ready: !!target && !inviteUrl },
    }[mode];

    // Dónde entra la persona: proyecto (si no viene fijado), rol y grupo de edad
    const placement = (
        <div className="grid sm:grid-cols-2 gap-4">
            {!fixedProject && (
                <div className="sm:col-span-2">
                    <SelectComponent
                        label={mode === "new" ? t("team.projectOptional") : t("team.project")}
                        value={projectId}
                        onChange={(e) => {
                            setProjectId(e.target.value);
                            setGroupId("");
                        }}
                        options={[
                            { value: "", label: mode === "new" ? t("staff.noGroupYet") : t("team.chooseProject") },
                            ...targets.map((p) => ({ value: p.projectId, label: p.projectName })),
                        ]}
                    />
                </div>
            )}
            {target && (
                <SelectComponent
                    label={t("staff.roleLabel")}
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    options={[
                        { value: "MONITOR", label: t("users.roleMonitor") },
                        { value: "COORDINATOR", label: t("users.roleCoordinator") },
                    ]}
                />
            )}
            {target && role === "MONITOR" && mode !== "invite" && target.groups.length > 0 && (
                <SelectComponent
                    label={t("team.group")}
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    options={[
                        { value: "", label: t("team.noGroup") },
                        ...target.groups.map((g) => ({ value: g.id, label: g.name })),
                    ]}
                />
            )}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={fixedProject && target ? t("team.addToProject", { project: target.projectName }) : t("staff.addToStaff")}
            size="md"
            footer={
                <>
                    <ButtonComponent onClick={onClose} variant="secondary" disabled={saving}>
                        {inviteUrl ? t("common.close") : t("common.cancel")}
                    </ButtonComponent>
                    {!inviteUrl && (
                        <ButtonComponent onClick={submit.run} variant="primary" disabled={saving || !submit.ready}>
                            {saving ? t("common.saving") : submit.label}
                        </ButtonComponent>
                    )}
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {modes.length > 1 && (
                    <div role="tablist" className="grid gap-1 bg-gray-100/80 rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
                        {modes.map((m) => (
                            <button
                                key={m}
                                type="button"
                                role="tab"
                                aria-selected={mode === m}
                                onClick={() => setMode(m)}
                                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium rounded-lg transition-all ${
                                    mode === m ? "bg-white text-yambo-green-700 shadow-sm" : "text-gray-500 hover:text-yambo-green-600"
                                }`}
                            >
                                <FontAwesomeIcon icon={MODE_ICONS[m]} className="w-3.5 h-3.5" />
                                {t(`team.mode.${m}`)}
                            </button>
                        ))}
                    </div>
                )}

                {mode === "new" && (
                    <>
                        <p className="text-sm text-gray-500 bg-yambo-green-50 border border-yambo-green-100 rounded-xl px-4 py-2.5">
                            {t("staff.newPersonHint")}
                        </p>
                        <InputComponent
                            label={t("staff.personName")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            required
                        />
                        <div className="grid sm:grid-cols-2 gap-4">
                            <InputComponent
                                label={t("users.nickname")}
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                maxLength={50}
                                placeholder={t("users.nicknamePlaceholder")}
                            />
                            <InputComponent
                                label={t("staff.emailOptional")}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t("staff.emailOptionalPlaceholder")}
                            />
                        </div>
                        {placement}
                    </>
                )}

                {mode === "existing" && (
                    <>
                        <div className="relative">
                            <InputComponent
                                label={t("staff.searchUser")}
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setSelectedUser(null);
                                }}
                                placeholder={t("staff.searchUserPlaceholder")}
                            />
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute right-4 bottom-3.5 w-3.5 h-3.5 text-gray-300" />
                        </div>
                        {searching && <p className="text-xs text-gray-400">{t("staff.searching")}</p>}
                        {!selectedUser && results.length > 0 && (
                            <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                {results.map((user) => (
                                    <button
                                        type="button"
                                        key={user.id}
                                        onClick={() => setSelectedUser(user)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-yambo-green-50/50 transition-colors"
                                    >
                                        <span className="font-medium">{user.name}</span>
                                        <span className="text-gray-400 text-xs ml-auto truncate">{user.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedUser && (
                            <>
                                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl px-3 py-2 text-sm">
                                    {t("staff.selected")}: <strong>{selectedUser.name}</strong>
                                    {selectedUser.email && <> ({selectedUser.email})</>}
                                </div>
                                {placement}
                            </>
                        )}
                    </>
                )}

                {mode === "invite" && (
                    <>
                        <p className="text-sm text-gray-500">{t("team.inviteHint")}</p>
                        {inviteUrl ? (
                            <div className="space-y-3">
                                <div className="bg-yambo-green-50 border border-yambo-green-200 rounded-xl p-3">
                                    <p className="text-xs text-yambo-green-600 font-medium mb-1">{t("team.inviteLink", { role: roleName })}</p>
                                    <p className="text-sm text-yambo-green-800 break-all font-mono">{inviteUrl}</p>
                                </div>
                                <ButtonComponent variant="primary" onClick={copyInvite} className="w-full">
                                    <FontAwesomeIcon icon={faCopy} className="mr-2" />
                                    {t("team.inviteCopy")}
                                </ButtonComponent>
                            </div>
                        ) : (
                            <>
                                {placement}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <InputComponent
                                        type="number"
                                        min={1}
                                        label={t("team.inviteMaxUses")}
                                        value={inviteMaxUses}
                                        onChange={(e) => setInviteMaxUses(e.target.value)}
                                        placeholder={t("team.inviteNoLimit")}
                                    />
                                    <InputComponent
                                        type="datetime-local"
                                        label={t("team.inviteExpires")}
                                        value={inviteExpiresAt}
                                        onChange={(e) => setInviteExpiresAt(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
