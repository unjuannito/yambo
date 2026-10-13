import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faMagnifyingGlass, faPenToSquare, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import type { User } from "~/types/userType";
import { RequirePermission } from "~/components/common/RequirePermission";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ElephantAvatar from "~/components/ElephantAvatar";
import { AddPersonModal } from "~/components/dashboard/team/AddPersonModal";
import { GiveAccessModal } from "~/components/dashboard/team/GiveAccessModal";
import { adminUserService } from "~/services/adminUserService";
import { useAuth } from "~/hooks/useAuth";
import { getErrorMessage } from "~/types/error";
import { loadAssignTargets, type AssignTarget } from "~/utils/groupOptions";
import { projectColor } from "~/utils/projectColor";

type StatusFilter = "all" | "noAccount" | "incomplete" | "noProject";

/** Roles de staff de una persona (los de padre no cuentan para el equipo). */
function staffRoles(user: User) {
    return (user.groupRoles ?? []).filter((gr) => gr.role === "MONITOR" || gr.role === "COORDINATOR");
}

function isIncomplete(user: User): boolean {
    return !user.staff?.bio;
}

/** «Todo el equipo»: todas las personas del equipo, estén en el proyecto que estén. */
export default function TeamDirectory() {
    const { t } = useTranslation();
    const location = useLocation();
    const { hasPermission } = useAuth();
    const canRead = hasPermission({ obj: "user", action: "read" });
    const canAdd = hasPermission({ obj: "user", action: "create" }) || hasPermission({ obj: "user", action: "update" });

    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [targets, setTargets] = useState<AssignTarget[]>([]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [accessUser, setAccessUser] = useState<User | null>(null);

    const refresh = () => setRefreshKey((k) => k + 1);

    useEffect(() => {
        if (!canAdd) return;
        loadAssignTargets()
            .then(setTargets)
            .catch((err) => toast.error(getErrorMessage(err, t("users.groupsLoadError"))));
    }, [canAdd]);

    useEffect(() => {
        if (!canRead) return;
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
        void fetchStaff();
    }, [refreshKey, canRead]);

    const counts = useMemo(() => ({
        all: staff.length,
        noAccount: staff.filter((u) => u.hasAccount === false).length,
        incomplete: staff.filter(isIncomplete).length,
        noProject: staff.filter((u) => staffRoles(u).length === 0).length,
    }), [staff]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return staff
            .filter((u) => {
                if (q && !`${u.name} ${u.staff?.nickname ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q)) return false;
                if (statusFilter === "noAccount") return u.hasAccount === false;
                if (statusFilter === "incomplete") return isIncomplete(u);
                if (statusFilter === "noProject") return staffRoles(u).length === 0;
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name, "es"));
    }, [staff, search, statusFilter]);

    if (!canRead) {
        return <p className="text-gray-400 text-center py-12">{t("team.chooseProjectHint")}</p>;
    }

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
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t("staff.withoutProject")}</span>
                        )}
                        {roles.map((gr) => {
                            const isCoordinator = gr.role === "COORDINATOR";
                            const { bg, text } = projectColor(gr.projectName + (gr.groupName || ""));
                            return (
                                <Link
                                    key={`${gr.groupId}-${gr.role}`}
                                    to={`/mi-espacio/proyectos/${gr.projectId}/equipo`}
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full hover:underline ${isCoordinator ? "bg-yambo-purple-100 text-yambo-purple-700" : ""}`}
                                    style={isCoordinator ? undefined : { backgroundColor: bg, color: text }}
                                >
                                    {isCoordinator
                                        ? t("public.staffRoleCoordinator", { project: gr.projectName })
                                        : gr.groupName
                                            ? `${gr.projectName} · ${gr.groupName}`
                                            : gr.projectName}
                                </Link>
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
                        state={{ back: location.pathname }}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border border-gray-200 text-yambo-green-600 hover:bg-yambo-green-50 hover:border-yambo-green-400 transition-colors"
                    >
                        <FontAwesomeIcon icon={faPenToSquare} className="w-3.5 h-3.5" />
                        {t("staff.editCard")}
                    </Link>
                    {user.hasAccount === false && (
                        <RequirePermission permission={{ obj: "user", action: "update" }} redirect={false}>
                            <button
                                type="button"
                                onClick={() => setAccessUser(user)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap bg-yambo-black text-white hover:bg-yambo-black/85 transition-colors"
                            >
                                <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5" />
                                {t("staff.giveAccess")}
                            </button>
                        </RequirePermission>
                    )}
                </div>
            </div>
        );
    };

    return (
        <section>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div className="relative flex-1 md:max-w-sm">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("staff.searchPlaceholder")}
                        aria-label={t("staff.searchPlaceholder")}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400 outline-none bg-white shadow-sm transition-all"
                    />
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {canAdd && (
                    <ButtonComponent variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="md:ml-auto">
                        <FontAwesomeIcon icon={faUserPlus} className="mr-1.5" />
                        {t("team.addPerson")}
                    </ButtonComponent>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {(["all", "noAccount", "incomplete", "noProject"] as const).map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        aria-pressed={statusFilter === s}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                            statusFilter === s
                                ? "bg-yambo-black text-white shadow-md"
                                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                        }`}
                    >
                        {t(`staff.status.${s}`)}
                        <span className={`ml-1.5 text-xs font-medium ${statusFilter === s ? "text-white/70" : "text-gray-400"}`}>{counts[s]}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-gray-400 text-center py-12">{t("staff.loading")}</p>
            ) : filtered.length === 0 ? (
                <p className="text-gray-400 text-center py-12">{t("staff.empty")}</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">{filtered.map(renderCard)}</div>
            )}

            <AddPersonModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onDone={refresh} targets={targets} />
            <GiveAccessModal user={accessUser} onClose={() => setAccessUser(null)} onDone={refresh} />
        </section>
    );
}
