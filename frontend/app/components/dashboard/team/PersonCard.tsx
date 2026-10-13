import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import ElephantAvatar from "~/components/ElephantAvatar";
import type { User } from "~/types/userType";

export interface PersonAction {
    key: string;
    label: string;
    icon: IconDefinition;
    /** Con `to` la acción es un enlace; si no, un botón. */
    to?: string;
    state?: unknown;
    onClick?: () => void;
    danger?: boolean;
}

interface PersonCardProps {
    user: User;
    actions: PersonAction[];
}

/** Una persona del equipo dentro de un bloque (coordinación o grupo), con su menú de acciones. */
export function PersonCard({ user, actions }: PersonCardProps) {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const displayName = user.staff?.nickname || user.name;
    const secondary = user.staff?.nickname ? user.name : user.email || t("staff.noEmail");

    const itemClass = (danger?: boolean) =>
        `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
            danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-yambo-green-50"
        }`;

    return (
        <div className="relative flex items-center gap-3 rounded-2xl border border-gray-100 bg-white pl-2 pr-1 py-2 hover:border-yambo-green-200 hover:shadow-sm transition-all">
            <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-yambo-green-50">
                {user.staff?.photo ? (
                    <img src={user.staff.photo} alt="" className="w-full h-full object-cover" style={{ objectPosition: "center top" }} />
                ) : (
                    <ElephantAvatar seed={user.id} config={user.staff?.avatar} title={displayName} className="w-full h-full" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-yambo-black truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{secondary}</p>
                {user.hasAccount === false && (
                    <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full bg-yambo-black/80 text-white">
                        {t("staff.noAccount")}
                    </span>
                )}
            </div>
            {actions.length > 0 && (
                <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={t("team.actionsFor", { name: displayName })}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                    <FontAwesomeIcon icon={faEllipsisVertical} className="w-4 h-4" />
                </button>
            )}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} role="presentation" />
                    <div role="menu" className="absolute right-1 top-full z-40 -mt-1 w-56 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden py-1">
                        {actions.map((action) =>
                            action.to ? (
                                <Link key={action.key} to={action.to} state={action.state} role="menuitem" className={itemClass(action.danger)}>
                                    <FontAwesomeIcon icon={action.icon} className="w-3.5 h-3.5 shrink-0" />
                                    {action.label}
                                </Link>
                            ) : (
                                <button
                                    key={action.key}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        action.onClick?.();
                                    }}
                                    className={itemClass(action.danger)}
                                >
                                    <FontAwesomeIcon icon={action.icon} className="w-3.5 h-3.5 shrink-0" />
                                    {action.label}
                                </button>
                            ),
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
