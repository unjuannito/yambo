import React from "react";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";
import type { IssueStatus } from "~/types/issueType";
import { ISSUE_STATUS_CONFIG } from "~/types/issueType";

interface IssueStatusBadgeProps {
    status: IssueStatus;
    className?: string;
}

export const IssueStatusBadge: React.FC<IssueStatusBadgeProps> = React.memo(
    ({ status, className = "" }) => {
        const { t } = useTranslation();
        const config = ISSUE_STATUS_CONFIG[status];

        if (!config) {
            return <span className="text-gray-400">{t('issues.unknownStatus') || "Estado desconocido"}</span>;
        }

        return (
            <span
                className={twMerge(`inline-block px-3.5 py-1 rounded-full text-sm font-semibold ${config.className} ${className}`)}
            >
                {config.label}
            </span>
        );
    }
);
