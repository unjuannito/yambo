import React from "react";
import type { IssueStatus } from "~/types/issueType";
import { ISSUE_STATUS_CONFIG } from "~/types/issueType";

interface IssueStatusBadgeProps {
    status: IssueStatus;
}

export const IssueStatusBadge: React.FC<IssueStatusBadgeProps> = React.memo(
    ({ status }) => {
        const config = ISSUE_STATUS_CONFIG[status];

        if (!config) {
            return <span className="text-gray-400">Estado desconocido</span>;
        }

        return (
            <span
                className={`inline-block px-3.5 py-1 rounded-full text-sm font-semibold ${config.className}`}
            >
                {config.label}
            </span>
        );
    }
);
