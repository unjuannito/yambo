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
        // Poner en la consola q ha llegado aqui para debugear
        console.log('Login successful, token received:', token);
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
}
