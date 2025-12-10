import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

export interface ApiError {
    type: string;
    message: string;
    path: string;
    status: number;
}

export class ApiService {
    protected baseUrl: string;
    protected axiosInstance: AxiosInstance;
    private static token: string | null = null;
    private static onTokenExpired: (() => void) | null = null;

    constructor() {
        this.baseUrl = import.meta.env.DEV ? "http://localhost:8080" : "/api";
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (typeof window !== "undefined") {
            window.addEventListener("storage", (event) => {
                if (event.key === "auth_token") {
                    ApiService.token = event.newValue;
                }
            });
        }

        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    const errorData = error.response?.data as
                        | ApiError
                        | undefined;
                    const isTokenExpired = errorData?.type === "TOKEN_EXPIRED";
                    const isInvalidToken = errorData?.type === "INVALID_TOKEN";

                    if (isTokenExpired || isInvalidToken) {
                        ApiService.setToken(null);
                        if (ApiService.onTokenExpired) {
                            ApiService.onTokenExpired();
                        }
                    }
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

    public static setOnTokenExpired(callback: (() => void) | null) {
        ApiService.onTokenExpired = callback;
    }

    protected static setToken(token: string | null) {
        ApiService.token = token;
        if (token) {
            localStorage.setItem("auth_token", token);
        } else {
            localStorage.removeItem("auth_token");
        }
    }

    protected static getToken(): string | null {
        if (!ApiService.token) {
            ApiService.token = localStorage.getItem("auth_token");
        }
        return ApiService.token;
    }

    protected async get<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> =
            await this.axiosInstance.get(endpoint);
        return response.data;
    }

    protected async post<T, D>(endpoint: string, data: D): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.post(
            endpoint,
            data
        );
        return response.data;
    }

    protected async put<T, D>(endpoint: string, data: D): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.put(
            endpoint,
            data
        );
        return response.data;
    }

    protected async delete<T>(endpoint: string): Promise<T> {
        const response: AxiosResponse<T> =
            await this.axiosInstance.delete(endpoint);
        return response.data;
    }
}
