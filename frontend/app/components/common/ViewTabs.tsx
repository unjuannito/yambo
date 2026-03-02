import { useState } from "react";

export type ViewTabKey = "actual" | "historico";

interface ViewTabsProps {
    activeTab: ViewTabKey;
    onTabChange: (tab: ViewTabKey) => void;
}

const TABS: { key: ViewTabKey; label: string; description: string }[] = [
    { key: "actual", label: "Actual", description: "Últimos 6 meses" },
    { key: "historico", label: "Histórico", description: "Todo el registro" },
];

export function ViewTabs({ activeTab, onTabChange }: ViewTabsProps) {
    return (
        <div className="flex border-b border-gray-200 mb-6">
            {TABS.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    {tab.label}
                    <span className="ml-1 text-xs text-gray-400">({tab.description})</span>
                </button>
            ))}
        </div>
    );
}

export function useViewTab(defaultTab: ViewTabKey = "actual") {
    const [activeTab, setActiveTab] = useState<ViewTabKey>(defaultTab);
    return { activeTab, setActiveTab };
}
