import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHouse,
    faClipboardList,
    faBagShopping,
    faComments,
    faEllipsis,
    faXmark,
    faRightFromBracket,
    faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { NAV_SECTIONS, NAV_ICONS } from "~/data/navConfig";
import { useAuth } from "~/hooks/useAuth";
import type { Link } from "~/data/links";

// The 4 primary tab names shown as bottom tabs
const PRIMARY_TABS = ["home", "myOrders", "merch", "issues"] as const;

interface BottomTabBarProps {
    links: Link[];
}

export default function BottomTabBar({ links }: BottomTabBarProps) {
    const { t } = useTranslation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const sheetRef = useRef<HTMLDivElement>(null);
    const moreButtonRef = useRef<HTMLButtonElement>(null);

    const handleLogout = () => {
        setSheetOpen(false);
        logout();
        navigate("/login", { replace: true });
    };

    // Close sheet on outside click
    useEffect(() => {
        if (!sheetOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (moreButtonRef.current?.contains(target)) {
                return;
            }

            if (sheetRef.current && !sheetRef.current.contains(target)) {
                setSheetOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [sheetOpen]);

    const linkMap = new Map(links.map((l) => [l.name, l]));

    // Primary tabs: show if available in user's links
    const primaryTabs = PRIMARY_TABS.map((name) => linkMap.get(name)).filter(
        (l): l is Link => l !== undefined,
    );

    const tabActiveClass = "text-yambo-green-600";
    const tabInactiveClass = "text-gray-400";

    return (
        <>
            {/* Bottom sheet overlay */}
            {sheetOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSheetOpen(false)}
                    role="presentation"
                />
            )}

            {/* Bottom sheet */}
            <div
                ref={sheetRef}
                className={`
          fixed bottom-16 inset-x-0 z-50 md:hidden
          bg-white/98 backdrop-blur-xl rounded-t-2xl shadow-2xl max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y
          transform transition-transform duration-300 ease-out
          ${sheetOpen ? "translate-y-0" : "translate-y-full"}
        `}
            >
                <div className="p-4 pb-safe pb-6">
                    {/* Handle & header */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                            {t('dashboard.moreOptions')}
                        </span>
                        <button type="button"
                            onClick={() => setSheetOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                            aria-label={t('common.close')}
                        >
                            <FontAwesomeIcon
                                icon={faXmark}
                                className="w-4 h-4"
                            />
                        </button>
                    </div>

                    {/* Secondary nav links grouped by section */}
                    {NAV_SECTIONS.map((section) => {
                        const sectionLinks = section.items
                            .map((name) => linkMap.get(name))
                            .filter(
                                (l): l is Link =>
                                    l !== undefined
                            );

                        if (sectionLinks.length === 0) return null;

                        return (
                            <div key={section.title} className="mb-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
                                    {section.title}
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    {sectionLinks.map((link) => (
                                        <NavLink
                                            key={link.name}
                                            to={link.href}
                                            end={!link.nested}
                                            onClick={() => setSheetOpen(false)}
                                            className={({ isActive }) =>
                                                `flex flex-col items-center gap-1 p-1.5 rounded-xl text-xs text-center transition-colors ${
                                                    isActive
                                                        ? "bg-yambo-green-50 text-yambo-green-700 font-semibold"
                                                        : "text-gray-600 hover:bg-gray-50"
                                                }`
                                            }
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center">
                                                {NAV_ICONS[link.name]}
                                            </span>
                                            <span className="leading-tight">
                                                {link.label}
                                            </span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center gap-2">
                            {/* Public page link */}
                            <a
                                href="/"
                                onClick={() => setSheetOpen(false)}
                                className="block flex-1 text-center px-4 py-2.5 rounded-full font-semibold text-white bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:shadow-lg hover:shadow-yambo-green-500/25 transition-all duration-300"
                            >
                                {t('dashboard.publicPage')}
                            </a>

                            {/* Logout */}
                            <button type="button"
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                            >
                                <FontAwesomeIcon
                                    icon={faRightFromBracket}
                                    className="w-4 h-4"
                                />
                                <span>{t('auth.logout')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom tab bar */}
            <nav className="fixed bottom-0 inset-x-0 h-16 z-50 flex md:hidden items-center justify-around bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-lg">
                {primaryTabs.map((link) => {
                    const icon =
                        link.name === "home"
                            ? faHouse
                            : link.name === "myOrders"
                              ? faClipboardList
                              : link.name === "merch"
                                ? faBagShopping
                                : faComments;

                    return (
                        <NavLink
                            key={link.name}
                            to={link.href}
                            end={link.name === "home"}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] ${
                                    isActive ? tabActiveClass : tabInactiveClass
                                }`
                            }
                        >
                            <FontAwesomeIcon icon={icon} className="w-5 h-5" />
                            <span className="text-[10px] font-medium leading-none flex justify-center">
                                {link.label}
                            </span>
                        </NavLink>
                    );
                })}

                {/* "Más" button */}
                <button type="button"
                    ref={moreButtonRef}
                    onClick={() => setSheetOpen((o) => !o)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] ${
                        sheetOpen ? tabActiveClass : tabInactiveClass
                    }`}
                >
                    <FontAwesomeIcon icon={faEllipsis} className="w-5 h-5" />
                    <span className="text-[10px] font-medium leading-none">
                        {t('dashboard.more')}
                    </span>
                </button>
            </nav>
        </>
    );
}
