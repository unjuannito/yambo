import { ApiService } from './apiService';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
}

export class AuthService extends ApiService {
    public async login(email: string, password: string): Promise<string> {
        const { token } = await this.post<AuthResponse, LoginRequest>('/auth/login', { email, password });
        ApiService.setToken(token);
        return token;
    }

    public async reload(): Promise<string> {
        const { token } = await this.post<AuthResponse, undefined>('/auth/reload', undefined);
        ApiService.setToken(token);
        return token;
    }

    public logout(): void {
        ApiService.setToken(null);
    }

    public isAuthenticated(): boolean {
        return !!ApiService.getToken();
    }

    public getToken(): string | null {
        return ApiService.getToken();
    }

    public setToken(token: string | null): void {
        ApiService.setToken(token);
    }

    public async forgotPassword(email: string): Promise<{ message: string }> {
        return this.post<{ message: string }, { email: string }>('/auth/forgot-password', { email });
    }

    public async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        return this.post<{ message: string }, { token: string; newPassword: string }>('/auth/reset-password', { token, newPassword });
    }

    public async getOAuth2Config(): Promise<{ providers: Array<{ name: string; displayName: string; clientId: string }> }> {
        return await this.get('/auth/oauth2/config');
    }
}
