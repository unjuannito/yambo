import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faArrowLeft,
    faArrowRight,
    faBolt,
    faBook,
    faCalendar,
    faChartColumn,
    faCheck,
    faCircleCheck,
    faCircleDot,
    faCircleQuestion,
    faClock,
    faCogs,
    faEnvelope,
    faExternalLink,
    faEye,
    faEyeSlash,
    faGlobe,
    faGraduationCap,
    faHandHoldingHeart,
    faHeart,
    faInbox,
    faMagnifyingGlass,
    faPaperclip,
    faPalette,
    faPen,
    faPeopleGroup,
    faPlus,
    faShield,
    faStar,
    faTrash,
    faUser,
    faUsers,
    faXmark,
    faBell,
    faPuzzlePiece,
    type IconDefinition as FA,
} from "@fortawesome/free-solid-svg-icons";

/**
 * Registro único de iconos de Yambo, por nombre. Permite pedir un icono desde cualquier
 * parte (componentes, datos de BD, configuración) por una clave textual sin empaquetar nada
 * extra. Usa Font Awesome (free solid) para mantener el mismo estilo que el resto del panel.
 */
export const ICONS = {
    "arrow-left": faArrowLeft,
    "arrow-right": faArrowRight,
    bolt: faBolt,
    book: faBook,
    calendar: faCalendar,
    chart: faChartColumn,
    check: faCheck,
    "circle-check": faCircleCheck,
    "circle-question": faCircleQuestion,
    clock: faClock,
    cogs: faCogs,
    envelope: faEnvelope,
    "external-link": faExternalLink,
    eye: faEye,
    "eye-slash": faEyeSlash,
    globe: faGlobe,
    "graduation-cap": faGraduationCap,
    "hand-heart": faHandHoldingHeart,
    heart: faHeart,
    inbox: faInbox,
    search: faMagnifyingGlass,
    paperclip: faPaperclip,
    palette: faPalette,
    pen: faPen,
    "people-group": faPeopleGroup,
    plus: faPlus,
    shield: faShield,
    star: faStar,
    trash: faTrash,
    user: faUser,
    users: faUsers,
    close: faXmark,
    bell: faBell,
    puzzle: faPuzzlePiece,
} satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

interface IconProps {
    name: IconName | string;
    className?: string;
    /** Si se pasa una etiqueta, el icono se expone como imagen accesible; si no, es decorativo. */
    label?: string;
}

/** Devuelve un icono por nombre. Si el nombre no existe, se muestra un punto neutro. */
export default function Icon({ name, className, label }: IconProps) {
    const definition: FA =
        (ICONS as Record<string, FA>)[name] ?? (faCircleDot as unknown as FA);
    return (
        <FontAwesomeIcon
            icon={definition}
            className={className}
            aria-hidden={label ? undefined : true}
            aria-label={label}
            role={label ? "img" : undefined}
        />
    );
}
