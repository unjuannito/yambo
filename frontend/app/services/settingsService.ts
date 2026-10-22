import { ApiService } from "./apiService";

export interface Setting {
    id: string;
    key: string;
    value: string;
    description: string;
    category: string;
}

export interface CreateSettingRequest {
    key: string;
    value?: string;
    description?: string;
    category?: string;
}

export interface UpdateSettingRequest {
    value?: string;
    description?: string;
    category?: string;
}

export interface EmailConfig {
    host: string;
    port: string;
    username: string;
    password: string;
    from: string;
    fromName?: string;
}

export interface SmtpAdvancedConfig {
    auth: boolean;
    starttlsEnable: boolean;
    starttlsRequired: boolean;
    connectionTimeout: number;
    timeout: number;
    writeTimeout: number;
}

export interface UploadConfig {
    maxFileSizeMb: number;
}

export interface OllamaConfig {
    apiUrl: string;
    model: string;
}

export interface OAuthProviderConfig {
    name: string;
    displayName: string;
    enabled: boolean;
    clientId: string;
    clientSecret: string;
}

export class SettingsService extends ApiService {
    public async getAllSettings(): Promise<Setting[]> {
        return await this.get<Setting[]>("/admin/settings");
    }

    public async getSettingsByCategory(category: string): Promise<Setting[]> {
        return await this.get<Setting[]>(`/admin/settings/category/${category}`);
    }

    public async getSettingByKey(key: string): Promise<Setting> {
        return await this.get<Setting>(`/admin/settings/key/${key}`);
    }

    public async createSetting(request: CreateSettingRequest): Promise<Setting> {
        return await this.post<Setting, CreateSettingRequest>("/admin/settings", request);
    }

    public async updateSetting(key: string, request: UpdateSettingRequest): Promise<Setting> {
        return await this.put<Setting, UpdateSettingRequest>(`/admin/settings/key/${key}`, request);
    }

    public async updateSettingsBulk(settings: Record<string, string>): Promise<string> {
        return await this.put<string, Record<string, string>>("/admin/settings/bulk", settings);
    }

    public async deleteSetting(key: string): Promise<string> {
        return await this.delete<string>(`/admin/settings/key/${key}`);
    }

    public async getDomain(): Promise<string> {
        const response = await this.get<{ domain: string }>("/admin/settings/app/domain");
        return response.domain;
    }

    public async setDomain(domain: string): Promise<string> {
        return await this.put<string, { domain: string }>("/admin/settings/app/domain", { domain });
    }

    public async getIban(): Promise<string> {
        const response = await this.get<{ iban: string }>("/admin/settings/bank/iban");
        return response.iban;
    }

    public async setIban(iban: string): Promise<string> {
        return await this.put<string, { iban: string }>("/admin/settings/bank/iban", { iban });
    }

    public async getEmailConfig(): Promise<EmailConfig> {
        return await this.get<EmailConfig>("/admin/settings/email");
    }

    public async updateEmailConfig(config: Partial<EmailConfig>): Promise<string> {
        return await this.put<string, Partial<EmailConfig>>("/admin/settings/email", config);
    }

    public async getSmtpAdvancedConfig(): Promise<SmtpAdvancedConfig> {
        return await this.get<SmtpAdvancedConfig>("/admin/settings/email/smtp");
    }

    public async updateSmtpAdvancedConfig(config: Partial<SmtpAdvancedConfig>): Promise<string> {
        return await this.put<string, Partial<SmtpAdvancedConfig>>("/admin/settings/email/smtp", config);
    }

    public async getIssueCreationWindowDays(): Promise<number> {
        const response = await this.get<{ days: number }>("/admin/settings/issues/creation-window-days");
        return response.days;
    }

    public async setIssueCreationWindowDays(days: number): Promise<string> {
        return await this.put<string, { days: number }>("/admin/settings/issues/creation-window-days", { days });
    }

    // Upload settings

    public async getUploadConfig(): Promise<UploadConfig> {
        return await this.get<UploadConfig>("/admin/settings/upload");
    }

    public async updateUploadConfig(config: Partial<UploadConfig>): Promise<string> {
        return await this.put<string, Partial<UploadConfig>>("/admin/settings/upload", config);
    }

    // AI / Ollama settings

    public async getOllamaConfig(): Promise<OllamaConfig> {
        return await this.get<OllamaConfig>("/admin/settings/ai/ollama");
    }

    public async updateOllamaConfig(config: Partial<OllamaConfig>): Promise<string> {
        return await this.put<string, Partial<OllamaConfig>>("/admin/settings/ai/ollama", config);
    }

    // OAuth settings

    public async getOAuthProviders(): Promise<OAuthProviderConfig[]> {
        return await this.get<OAuthProviderConfig[]>("/admin/settings/oauth");
    }

    public async updateOAuthProvider(provider: string, config: Partial<OAuthProviderConfig>): Promise<string> {
        return await this.put<string, Partial<OAuthProviderConfig>>(`/admin/settings/oauth/${provider}`, config);
    }
}

export const settingsService = new SettingsService();
