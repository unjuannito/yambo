import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { WikiGuideLink, type WikiGuideLinkProps } from "./WikiGuideLink";

interface PageHeaderProps {
    title: ReactNode;
    /** Small breadcrumb/label shown above the title (e.g. "Invitaciones"). */
    subtitle?: ReactNode;
    /** Helper text shown below the title. */
    description?: ReactNode;
    /** Right-aligned actions (buttons, etc.). */
    actions?: ReactNode;
    /** Enlace "Ver en la wiki" mostrado SIEMPRE debajo del título y subtítulo. */
    wiki?: WikiGuideLinkProps;
    className?: string;
}

/**
 * Consistent page header used across the admin (mi-espacio) section:
 * subtitle label + title + description on the left, actions on the right.
 * Si `wiki` está definido, el enlace "Ver en la wiki" aparece debajo del
 * título y subtítulo, antes de las acciones.
 */
export function PageHeader({
    title,
    subtitle,
    description,
    actions,
    wiki,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={twMerge(
                "flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6",
                className
            )}
        >
            <div className="min-w-0">
                {subtitle && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-yambo-green-600 mb-1">
                        {subtitle}
                    </p>
                )}
                <h1 className="text-3xl font-extrabold font-display text-yambo-black">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">
                        {description}
                    </p>
                )}
                {wiki && (
                    <div className="mt-2">
                        <WikiGuideLink {...wiki} />
                    </div>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
