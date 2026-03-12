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
    <div className="flex gap-1 bg-gray-100 rounded-full p-1 mb-6 w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            activeTab === tab.key
              ? "bg-white text-yambo-green-600 shadow-sm font-semibold"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
          <span className="ml-1 text-xs text-gray-400">
            ({tab.description})
          </span>
        </button>
      ))}
    </div>
  );
}

export function useViewTab(defaultTab: ViewTabKey = "actual") {
  const [activeTab, setActiveTab] = useState<ViewTabKey>(defaultTab);
  return { activeTab, setActiveTab };
}
