import { ApiService } from "./apiService";
import type { FileRecord } from "~/types/fileType";

export class FileService extends ApiService {
    public async upload(file: File): Promise<FileRecord> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await this.axiosInstance.post<FileRecord>(
            "/files",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
            }
        );
        return response.data;
    }

    public async getById(fileId: string): Promise<FileRecord> {
        return await this.get<FileRecord>(`/files/${fileId}`);
    }

    public async listMine(): Promise<FileRecord[]> {
        return await this.get<FileRecord[]>("/files/mine");
    }

    public async deleteFile(fileId: string): Promise<void> {
        return await this.delete<void>(`/files/${fileId}`);
    }
}

export const fileService = new FileService();
