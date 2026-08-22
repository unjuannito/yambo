import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookOpen } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

interface WikiGuideLinkProps {
    /** Slug de la guía en la wiki (id de la guía, p.ej. "configuracion") */
    slug: string;
    className?: string;
}

/**
 * Enlace "Ver en la wiki" — se usa en las páginas de administración que
 * tienen una guía asociada en /mi-espacio/admin/guias/<slug>.
 */
export function WikiGuideLink({ slug, className }: WikiGuideLinkProps) {
    const { t } = useTranslation();
    return (
        <Link
            to={`/mi-espacio/admin/guias/${slug}`}
            className={`inline-flex items-center gap-1.5 text-xs text-yambo-green-600 hover:text-yambo-green-800 hover:underline transition-colors ${className ?? ""}`}
        >
            <FontAwesomeIcon icon={faBookOpen} className="w-3.5 h-3.5" />
            {t("component.statusWorkflow.wikiLink")}
        </Link>
    );
}
