import { useTranslation } from "react-i18next";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  label?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  className = "",
}: DateRangePickerProps) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-md py-1 px-2 font-semibold text-gray-700 truncate">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) =>
            onChange({ startDate: e.target.value, endDate })
          }
          className="block w-full rounded-xl border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 placeholder-gray-400 transition-all duration-200"
          placeholder={t("common.startDate")}
        />
        <span className="text-gray-300 text-sm">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) =>
            onChange({ startDate, endDate: e.target.value })
          }
          className="block w-full rounded-xl border border-gray-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 focus:border-yambo-green-500 placeholder-gray-400 transition-all duration-200"
          placeholder={t("common.endDate")}
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => onChange({ startDate: "", endDate: "" })}
            className="text-gray-300 hover:text-red-400 text-sm px-1 transition-colors"
            title={t("component.dateRange.clearDates")}
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}
