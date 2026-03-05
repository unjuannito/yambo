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
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                        onChange({ startDate: e.target.value, endDate })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1.5 px-2 border"
                    placeholder="Desde"
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                        onChange({ startDate, endDate: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1.5 px-2 border"
                    placeholder="Hasta"
                />
                {(startDate || endDate) && (
                    <button
                        type="button"
                        onClick={() =>
                            onChange({ startDate: "", endDate: "" })
                        }
                        className="text-gray-400 hover:text-gray-600 text-sm px-1"
                        title="Limpiar fechas"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
