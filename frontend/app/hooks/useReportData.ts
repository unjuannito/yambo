import { useState, useEffect, useCallback } from "react";
import { reportService } from "~/services/reportService";
import type { ReportSummary } from "~/types/report";

interface UseReportDataResult {
    data: ReportSummary | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    startDate: string;
    endDate: string;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
}

function getDefaultDateRange(): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
    };
}

export function useReportData(): UseReportDataResult {
    const defaults = getDefaultDateRange();
    const [startDate, setStartDate] = useState(defaults.start);
    const [endDate, setEndDate] = useState(defaults.end);
    const [data, setData] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await reportService.getSummary(startDate, endDate);
            setData(result);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Error al cargar los datos del informe"
            );
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
    };
}
