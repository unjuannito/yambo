import { ApiService } from "./apiService";

/** Un token {{...}} disponible en una plantilla, con su etiqueta y valor de ejemplo. */
export interface EmailTemplateToken {
  token: string;
  varName: string;
  label: string;
  sample: unknown;
}

export interface EmailTemplateView {
  key: string;
  displayName: string;
  description: string;
  tokens: EmailTemplateToken[];
  primaryLinkToken: string | null;
  overridden: boolean;
  subject: string | null;
  body: string | null;
  variableOverrides?: Record<string, string>;
  variableDefaults?: Record<string, unknown>;
}

export interface EmailTemplateSaveRequest {
  variableOverrides?: Record<string, string>;
  subject?: string | null;
  body?: string | null;
}

export interface EmailTemplatePreviewResponse {
  html: string;
}

export interface EmailTemplateSendTestRequest {
  variableOverrides?: Record<string, string>;
  to: string;
  subject?: string | null;
  body?: string | null;
}

class EmailTemplateService extends ApiService {
  async list(): Promise<EmailTemplateView[]> {
    return this.get<EmailTemplateView[]>("/email-templates");
  }

  async getByKey(key: string): Promise<EmailTemplateView> {
    return this.get<EmailTemplateView>(`/email-templates/${key}`);
  }

  async save(
    key: string,
    data: EmailTemplateSaveRequest,
  ): Promise<EmailTemplateView> {
    return this.post<EmailTemplateView, EmailTemplateSaveRequest>(
      `/email-templates/${key}`,
      data,
    );
  }

  async resetAll(): Promise<EmailTemplateView[]> {
    return this.delete<EmailTemplateView[]>("/email-templates");
  }

  async reset(key: string): Promise<EmailTemplateView> {
    return this.delete<EmailTemplateView>(`/email-templates/${key}`);
  }

  async preview(
    key: string,
    body?: string | null,
    variableOverrides?: Record<string, string>,
  ): Promise<EmailTemplatePreviewResponse> {
    return this.post<EmailTemplatePreviewResponse, EmailTemplateSaveRequest>(
      `/email-templates/${key}/preview`,
      { body: body ?? null, variableOverrides },
    );
  }

  async sendTest(
    key: string,
    data: EmailTemplateSendTestRequest,
  ): Promise<void> {
    await this.post<void, EmailTemplateSendTestRequest>(
      `/email-templates/${key}/test`,
      data,
    );
  }
}

export const emailTemplateService = new EmailTemplateService();
