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

export default function SummaryCards({ cards, counts, title }: SummaryCardsProps) {
    const { hasPermission } = useAuth();

    const visibleCards = cards.filter(
        (card) => !card.permission || hasPermission(card.permission)
    );

    if (visibleCards.length === 0) return null;

    return (
        <section>
            {title && (
                <h2 className="text-lg font-semibold text-gray-700 mb-3">{title}</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCards.map((card) => (
                    <Link
                        key={card.key}
                        to={card.href}
                        className={`group flex items-center gap-4 p-4 rounded-xl border ${card.colorClass} hover:shadow-md transition-all duration-200`}
                    >
                        <div
                            className={`flex items-center justify-center w-12 h-12 rounded-lg ${card.iconBgClass}`}
                        >
                            <FontAwesomeIcon icon={card.icon} className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">{card.label}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {counts[card.key] ?? "—"}
                            </p>
                        </div>
                        <FontAwesomeIcon
                            icon={faArrowRight}
                            className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </Link>
                ))}
            </div>
        </section>
    );
}