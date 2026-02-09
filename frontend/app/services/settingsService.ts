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

    // Métodos específicos
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
}

export const settingsService = new SettingsService();
