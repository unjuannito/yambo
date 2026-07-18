import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "~/hooks/useAuth";
import type { SummaryCardConfig } from "~/data/summaries";

interface SummaryCardsProps {
    readonly cards: ReadonlyArray<SummaryCardConfig>;
    readonly counts: Readonly<Record<string, number>>;
    readonly title?: string;
    readonly columns?: 2 | 3 | 4 | 5;
}

const COL_CLASSES: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

const SummaryCardLink = React.memo(function SummaryCardLink({
    card,
    count,
}: {
    card: SummaryCardConfig;
    count: number | undefined;
}) {
    return (
        <Link
            to={card.href}
            className={`group flex items-center gap-2 p-2.5 rounded-xl border ${card.colorClass} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
        >
            <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg ${card.iconBgClass} shrink-0`}
            >
                <FontAwesomeIcon icon={card.icon} className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 truncate">{card.label}</p>
                <p className="text-base font-extrabold font-display text-yambo-black">
                    {count ?? "—"}
                </p>
            </div>
            <FontAwesomeIcon
                icon={faArrowRight}
                className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 shrink-0"
            />
        </Link>
    );
});

export default function SummaryCards({ cards, counts, title, columns = 2 }: SummaryCardsProps) {
    const { hasPermission } = useAuth();

    const visibleCards = cards.filter(
        (card) => !card.permission || hasPermission(card.permission)
    );

    if (visibleCards.length === 0) return null;

    return (
        <section>
            {title && (
                <h2 className="text-xs font-bold font-display text-gray-500 uppercase tracking-wider mb-1.5">{title}</h2>
            )}
            <div className={`grid ${COL_CLASSES[columns]} gap-2`}>
                {visibleCards.map((card) => (
                    <SummaryCardLink
                        key={card.key}
                        card={card}
                        count={counts[card.key]}
                    />
                ))}
            </div>
        </section>
    );
}
