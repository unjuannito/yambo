export enum ImageUsageContext {
    USER_PHOTO = 'USER_PHOTO',
    PRODUCT_IMAGE = 'PRODUCT_IMAGE',
    PROJECT_IMAGE = 'PROJECT_IMAGE',
    HOME_IMAGE = 'HOME_IMAGE',
    MARKDOWN_IMAGE = 'MARKDOWN_IMAGE',
}

export interface ImageRecord {
    id: string;
    originalName: string;
    contentType: string;
    size: number;
    url: string;
    context: string;
    referenceId?: string;
    uploadedBy: string;
    uploadedByName: string;
    uploadedAt: string;
}
