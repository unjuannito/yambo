export interface PagedInfo {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface PagedResponse<T> {
    content: T[];
    page: PagedInfo;
}
