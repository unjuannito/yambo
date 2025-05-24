import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

export class ApiService {
    protected baseUrl: string;
    protected axiosInstance: AxiosInstance;
    private static token: string | null = null;

    constructor() {
        this.baseUrl = import.meta.env.DEV ? 'http://localhost:8080' : '/api';
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    ApiService.setToken(null);
                }
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = ApiService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    protected static setToken(token: string | null) {
        ApiService.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    protected static getToken(): string | null {
        if (!ApiService.token) {
            ApiService.token = localStorage.getItem('auth_token');
        }
        return ApiService.token;
    }

    protected async get<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint);
        return response.data;
    }

    protected async post<T>(endpoint: string, data: any): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, data);
        return response.data;
    }

    protected async put<T>(endpoint: string, data: any): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.put(endpoint, data);
        return response.data;
    }

    protected async delete<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint);
        return response.data;
    }
}
