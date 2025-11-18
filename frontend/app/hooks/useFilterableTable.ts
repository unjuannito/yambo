import { useState, useMemo, useCallback } from "react";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import type { FilterValues } from "~/components/common/types/tableTypes";
import type { PagedInfo } from "~/types/apiType";

interface UseFilterableTableProps<T> {
    data: T[];
    columns: FilterableColumn<T>[];
    pageSize?: number;
    enableSearch?: boolean;
    enableFilters?: boolean;
    enablePagination?: boolean;
    serverSide?: boolean;
    pageInfo?: PagedInfo;
    onPageChange?: (page: number) => void;
    onFiltersChange?: (filters: FilterValues) => void;
    onSearchChange?: (search: string) => void;
}

export function useFilterableTable<T>({
    data,
    columns,
    pageSize = 10,
    enableSearch = true,
    enableFilters = true,
    enablePagination = true,
    serverSide = false,
    pageInfo,
    onPageChange,
    onFiltersChange: onFiltersChangeProp,
    onSearchChange: onSearchChangeProp,
}: UseFilterableTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<FilterValues>({});
    const [internalPage, setInternalPage] = useState(0);

    const activePage =
        serverSide && pageInfo !== undefined ? pageInfo.page : internalPage;
    const activePageSize =
        serverSide && pageInfo !== undefined ? pageInfo.size : pageSize;

    // Extract filter fields from columns
    const filterFields = useMemo(() => {
        return columns
            .filter((col) => col.filter?.enabled)
            .map((col) => ({
                key: col.key,
                label: col.header,
                type: col.filter?.type || "text",
                placeholder: col.filter?.placeholder,
                options: col.filter?.options,
            }));
    }, [columns]);

    const filteredData = useMemo(() => {
        if (serverSide) return data;

        let result = [...data];

        if (enableSearch && searchTerm) {
            result = result.filter((item) => {
                return columns.some((column) => {
                    const value = item[column.key as keyof T];
                    return String(value || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());
                });
            });
        }

        if (enableFilters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== "" && value !== null) {
                    if (Array.isArray(value)) {
                        if (value.length > 0) {
                            result = result.filter((item) => {
                                const itemValue = item[key as keyof T];

                                if (Array.isArray(itemValue)) {
                                    return itemValue.some((obj: any) => {
                                        const idValue = obj?.id || obj;
                                        return value.includes(String(idValue));
                                    });
                                }

                                return value.includes(String(itemValue));
                            });
                        }
                    } else {
                        // Single value filter
                        result = result.filter((item) => {
                            const itemValue = item[key as keyof T];
                            return String(itemValue || "")
                                .toLowerCase()
                                .includes(String(value).toLowerCase());
                        });
                    }
                }
            });
        }

        return result;
    }, [
        data,
        searchTerm,
        filters,
        columns,
        enableSearch,
        enableFilters,
        serverSide,
    ]);

    const paginatedData = useMemo(() => {
        if (serverSide) return data;
        if (!enablePagination) return filteredData;
        const startIndex = activePage * activePageSize;
        return filteredData.slice(startIndex, startIndex + activePageSize);
    }, [
        filteredData,
        activePage,
        activePageSize,
        enablePagination,
        serverSide,
        data,
    ]);

    const calculatedTotalPages =
        serverSide && pageInfo !== undefined
            ? pageInfo.totalPages
            : Math.ceil(filteredData.length / pageSize);

    const calculatedTotalElements =
        serverSide && pageInfo !== undefined
            ? pageInfo.totalElements
            : filteredData.length;

    const handleFiltersChange = useCallback(
        (newFilters: FilterValues) => {
            setFilters(newFilters);
            if (serverSide && onFiltersChangeProp) {
                onFiltersChangeProp(newFilters);
            } else {
                setInternalPage(0);
            }
        },
        [serverSide, onFiltersChangeProp]
    );

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchTerm(value);
            if (serverSide && onSearchChangeProp) {
                onSearchChangeProp(value);
            } else {
                setInternalPage(0);
            }
        },
        [serverSide, onSearchChangeProp]
    );

    const handlePageChange = useCallback(
        (page: number) => {
            if (serverSide && onPageChange) {
                onPageChange(page);
            } else {
                setInternalPage(page);
            }
        },
        [serverSide, onPageChange]
    );

    return {
        searchTerm,
        filters,
        activePage,
        activePageSize,
        filterFields,
        paginatedData,
        calculatedTotalPages,
        calculatedTotalElements,
        handleFiltersChange,
        handleSearchChange,
        handlePageChange,
    };
}
