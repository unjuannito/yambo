import { useState } from "react";
import { useTranslation } from "react-i18next";

export type ViewTabKey = "actual" | "historico";

interface ViewTabsProps {
  activeTab: ViewTabKey;
  onTabChange: (tab: ViewTabKey) => void;
}

export function ViewTabs({ activeTab, onTabChange }: ViewTabsProps) {
  const { t } = useTranslation();
  const TABS: { key: ViewTabKey; label: string; description: string }[] = [
    { key: "actual", label: t("component.viewTabs.current"), description: t("component.viewTabs.last6Months") },
    { key: "historico", label: t("component.viewTabs.historical"), description: t("component.viewTabs.allRecords") },
  ];

  return (
    <div className="flex gap-1 bg-gray-100 rounded-full p-1 mb-6 w-full sm:w-fit">
      {TABS.map((tab) => (
        <button type="button"
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            activeTab === tab.key
              ? "bg-white text-yambo-green-600 shadow-sm font-semibold"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
          <span className="ml-1 text-xs text-gray-400 hidden sm:inline">
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
