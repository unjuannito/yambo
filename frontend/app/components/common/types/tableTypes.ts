export type FilterType = 'text' | 'search' | 'select' | 'multi-select' | 'checkbox' | 'toggle' | 'date-range';

export interface FilterOption {
    value: string;
    label: string;
}

export interface ColumnFilter {
    enabled: boolean;
    type?: FilterType;
    placeholder?: string;
    options?: FilterOption[];
}

export interface FilterField {
    key: string;
    label: string;
    type: FilterType;
    placeholder?: string;
    options?: FilterOption[];
}

export type FilterValues = Record<string, any>;
