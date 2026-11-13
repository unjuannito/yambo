import { ApiService } from "./apiService";

/** Un elemento común de correo (issue #123, Part 2): header/footer (built-in) o un componente creado por el admin. */
export interface EmailCommonElementView {
    key: string;
    name: string;
    description: string | null;
    html: string;
    builtIn: boolean;
    properties?: { key: string; label: string; type: "text" | "url" | "color" | "boolean" | "number" | "email" | "image" | "date" | "datetime"; defaultValue: string }[];
}

export interface EmailCommonElementCreateRequest {
    name: string;
    html: string;
    description?: string | null;
}

export interface EmailCommonElementUpdateRequest {
    html: string;
}

class EmailCommonElementService extends ApiService {
    async list(): Promise<EmailCommonElementView[]> {
        return this.get<EmailCommonElementView[]>("/email-common-elements");
    }

    async create(data: EmailCommonElementCreateRequest): Promise<EmailCommonElementView> {
        return this.post<EmailCommonElementView, EmailCommonElementCreateRequest>("/email-common-elements", data);
    }

    async update(key: string, data: EmailCommonElementUpdateRequest): Promise<EmailCommonElementView> {
        return this.put<EmailCommonElementView, EmailCommonElementUpdateRequest>(`/email-common-elements/${key}`, data);
    }

    async reset(key: string): Promise<EmailCommonElementView> {
        return this.post<EmailCommonElementView, Record<string, never>>(`/email-common-elements/${key}/reset`, {});
    }

    async remove(key: string): Promise<void> {
        await this.delete<void>(`/email-common-elements/${key}`);
    }
}

export const emailCommonElementService = new EmailCommonElementService();
