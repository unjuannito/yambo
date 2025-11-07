/**
 * Generic types and interfaces for reusable UI components
 *
 * This module provides type definitions for components that can work with different data structures:
 * - FilterField: Configuration for filter inputs (text, select)
 * - TableColumn: Configuration for table columns with optional custom rendering
 * - DataTable: Generic table component that accepts any data type
 * - FiltersSection: Generic filter component with configurable fields
 * - Pagination: Reusable pagination component
 *
 * These types enable building data-independent components that can be reused across different pages
 * and data structures while maintaining type safety.
 */

import type { User } from "~/types/userType";

export interface Filters {
    name: string;
    email: string;
    enabled: boolean | undefined;
    profiles: string;
}

export interface FilterField {
    key: string;
    label: string;
    type: 'text' | 'select';
    placeholder?: string;
    options?: { value: string; label: string }[];
}

export interface FiltersSectionProps {
    filters: Record<string, any>;
    fields: FilterField[];
    onFiltersChange: (filters: Record<string, any>) => void;
    onSearch: () => void;
    title?: string;
}

export interface TableColumn<T = any> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

export interface UsersTableProps {
    users: import("~/services/adminUserService").PagedUsers;
    currentUser: any;
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
}

export interface PaginationProps {
    page: number;
    totalPages: number;
    totalElements: number;
    size: number;
    onPageChange: (page: number) => void;
    itemName?: string;
    previousLabel?: string;
    nextLabel?: string;
}