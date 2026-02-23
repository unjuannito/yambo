import { ApiService } from "./apiService";
import type { ImageRecord } from "~/types/imageType";
import type { ImageUsageContext } from "~/types/imageType";

export class ImageService extends ApiService {
    /**
     * Upload an image file with context and optional reference.
     */
    public async upload(
        file: File,
        context: ImageUsageContext,
        referenceId?: string
    ): Promise<ImageRecord> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("context", context);
        if (referenceId) {
            formData.append("referenceId", referenceId);
        }

        const response = await this.axiosInstance.post<ImageRecord>(
            "/images",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
            }
        );
        return response.data;
    }

    /**
     * Get image metadata by ID.
     */
    public async getById(imageId: string): Promise<ImageRecord> {
        return await this.get<ImageRecord>(`/images/${imageId}`);
    }

    /**
     * List images by context and optional reference.
     */
    public async listByContext(
        context: ImageUsageContext,
        referenceId?: string
    ): Promise<ImageRecord[]> {
        const params = new URLSearchParams({ context });
        if (referenceId) {
            params.append("referenceId", referenceId);
        }
        return await this.get<ImageRecord[]>(`/images?${params.toString()}`);
    }

    /**
     * List all images uploaded by the current user.
     */
    public async listMine(): Promise<ImageRecord[]> {
        return await this.get<ImageRecord[]>("/images/mine");
    }

    /**
     * Delete an image by ID.
     */
    public async deleteImage(imageId: string): Promise<void> {
        return await this.delete<void>(`/images/${imageId}`);
    }
}

export const imageService = new ImageService();
