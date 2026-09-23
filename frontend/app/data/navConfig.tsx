import type { JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faHouse, faUser, faGear, faPenToSquare, faUsers,
    faShieldHalved, faEnvelope, faGift, faClipboard,
    faCommentDots, faFolder, faCalendarDays, faBagShopping, faCubes,
    faClipboardList, faComments, faCartShopping,
    faRightFromBracket,
    faEnvelopesBulk,
    faMagnifyingGlass,
    faChartLine,
    faPeopleGroup,
    faGavel,
    faBook,
} from "@fortawesome/free-solid-svg-icons";

export interface NavSection {
    title: string;
    items: string[]; // Link names that map to LINKS_MAP
}

// Navigation sections - defines the structure and grouping of links
export const NAV_SECTIONS: NavSection[] = [
    {
        title: "General",
        items: ["home", "myAccount"]
    },
    {
        title: "Administración",
        items: ["settings", "mainPage", "users", "profiles", "invitations", "orders", "adminIssues", "seo", "legal", "reports"]
    },
    {
        title: "Proyectos",
        items: ["projects", "activities"]
    },
    {
        title: "Artículos",
        items: ["merch", "merchFamilies", "myOrders", "cart", "issues"]
    },
    {
        title: "Documentación",
        items: ["guides"]
    }
];

// Icon components for navigation - maps link names to their icons
export const NAV_ICONS: Record<string, JSX.Element> = {
    home: <FontAwesomeIcon icon={faHouse} className="w-5 h-5" />,
    myAccount: <FontAwesomeIcon icon={faUser} className="w-5 h-5" />,
    settings: <FontAwesomeIcon icon={faGear} className="w-5 h-5" />,
    mainPage: <FontAwesomeIcon icon={faPenToSquare} className="w-5 h-5" />,
    users: <FontAwesomeIcon icon={faUsers} className="w-5 h-5" />,
    profiles: <FontAwesomeIcon icon={faShieldHalved} className="w-5 h-5" />,
    nominativeInvitations: <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5" />,
    invitations: <FontAwesomeIcon icon={faEnvelopesBulk} className="w-5 h-5" />,
    orders: <FontAwesomeIcon icon={faClipboard} className="w-5 h-5" />,
    adminIssues: <FontAwesomeIcon icon={faCommentDots} className="w-5 h-5" />,
    seo: <FontAwesomeIcon icon={faMagnifyingGlass} className="w-5 h-5" />,
    legal: <FontAwesomeIcon icon={faGavel} className="w-5 h-5" />,
    reports: <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />,
    projects: <FontAwesomeIcon icon={faFolder} className="w-5 h-5" />,
    crew: <FontAwesomeIcon icon={faPeopleGroup} className="w-5 h-5" />,
    activities: <FontAwesomeIcon icon={faCalendarDays} className="w-5 h-5" />,
    merch: <FontAwesomeIcon icon={faBagShopping} className="w-5 h-5" />,
    merchFamilies: <FontAwesomeIcon icon={faCubes} className="w-5 h-5" />,
    myOrders: <FontAwesomeIcon icon={faClipboardList} className="w-5 h-5" />,
    issues: <FontAwesomeIcon icon={faComments} className="w-5 h-5" />,
    cart: <FontAwesomeIcon icon={faCartShopping} className="w-5 h-5" />,
    guides: <FontAwesomeIcon icon={faBook} className="w-5 h-5" />,
    logout: <FontAwesomeIcon icon={faRightFromBracket} className="w-5 h-5" />,
};
