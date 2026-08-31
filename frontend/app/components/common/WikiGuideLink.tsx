import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen, faInfo, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

interface WikiGuideLinkProps {
    /** Slug de la guía en la wiki (id de la guía, p.ej. "configuracion" o "flujos-de-trabajo") */
    slug: string;
    /** Opcional: ancla dentro de la guía (p.ej. "pedidos" → /guias/flujos-de-trabajo#pedidos) */
    hash?: string;
    className?: string;
}

export type { WikiGuideLinkProps };

/**
 * Enlace "Ver en la wiki" — se usa en las páginas de administración que
 * tienen una guía asociada en /mi-espacio/admin/guias/<slug>[#hash].
 */
export function WikiGuideLink({ slug, hash, className }: WikiGuideLinkProps) {
    const { t } = useTranslation();
    const href = hash ? `/mi-espacio/admin/guias/${slug}#${hash}` : `/mi-espacio/admin/guias/${slug}`;
    return (
        <Link
            to={href}
            aria-label={t("component.statusWorkflow.wikiLink")}
            className={`inline-flex items-center gap-1.5 text-xs text-yambo-green-600 hover:text-yambo-green-800 hover:underline transition-colors ${className ?? ""}`}
        >
            <FontAwesomeIcon icon={faCircleInfo} className="w-3.5 h-3.5" />
        </Link>
    );
}
