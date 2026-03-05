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
                    className="block w-full rounded-lg border border-gray-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    placeholder="Desde"
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                        onChange({ startDate, endDate: e.target.value })
                    }
                    className="block w-full rounded-lg border border-gray-300 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
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
