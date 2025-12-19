export interface PagedInfo {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface PagedResponse<T> {
    content: T[];
    page: PagedInfo;
}
