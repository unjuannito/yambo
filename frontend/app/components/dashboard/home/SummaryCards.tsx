import React from "react";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "~/hooks/useAuth";
import type { SummaryCardConfig } from "~/data/summaries";

interface SummaryCardsProps {
    cards: SummaryCardConfig[];
    counts: Record<string, number>;
    title?: string;
}

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
            className={`group flex items-center gap-4 p-5 rounded-2xl border ${card.colorClass} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
        >
            <div
                className={`flex items-center justify-center w-13 h-13 rounded-xl ${card.iconBgClass}`}
            >
                <FontAwesomeIcon icon={card.icon} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-2xl font-extrabold font-display text-yambo-black">
                    {count ?? "—"}
                </p>
            </div>
            <FontAwesomeIcon
                icon={faArrowRight}
                className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200"
            />
        </Link>
    );
});

export default function SummaryCards({ cards, counts, title }: SummaryCardsProps) {
    const { hasPermission } = useAuth();

    const visibleCards = cards.filter(
        (card) => !card.permission || hasPermission(card.permission)
    );

    if (visibleCards.length === 0) return null;

    return (
        <section>
            {title && (
                <h2 className="text-lg font-bold font-display text-yambo-black mb-4">{title}</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
