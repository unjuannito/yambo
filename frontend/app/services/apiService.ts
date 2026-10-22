import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import { ApiError, ErrorTypes, type ErrorResponse } from "~/types/error";

export interface Filters {
    [key: string]: string | number | boolean | undefined | string[];
}

export interface PagedParams {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "ASC" | "DESC";
}

export class ApiService {
    protected baseUrl: string;
    protected axiosInstance: AxiosInstance;
    private static token: string | null = null;
    private static onTokenExpired: (() => void) | null = null;

    constructor() {
        this.baseUrl = "/api";
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
                // Network error — no response from server
                if (!error.response) {
                    return Promise.reject(new ApiError({
                        id: "",
                        timestamp: new Date().toISOString(),
                        type: ErrorTypes.NETWORK_ERROR,
                        message: "No se pudo conectar con el servidor",
                        path: error.config?.url ?? "",
                        status: 0,
                    }));
                }

                if (error.response?.status === 401) {
                    const errorData = error.response?.data as
                        | ErrorResponse
                        | undefined;
                    const isTokenExpired = errorData?.type === ErrorTypes.TOKEN_EXPIRED;
                    const isInvalidToken = errorData?.type === ErrorTypes.INVALID_TOKEN;

                    if (isTokenExpired || isInvalidToken) {
                        ApiService.setToken(null);
                        if (ApiService.onTokenExpired) {
                            ApiService.onTokenExpired();
                        }
                    }
                }

                const data = error.response?.data;
                if (data && typeof data === "object" && "type" in data && "message" in data) {
                    return Promise.reject(new ApiError({
                        id: data.id ?? "",
                        timestamp: data.timestamp ?? new Date().toISOString(),
                        type: data.type,
                        message: data.message,
                        path: data.path ?? "",
                        status: error.response?.status ?? 0,
                        details: data.details,
                    }));
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
        if (typeof window === "undefined") return;
        if (token) {
            localStorage.setItem("auth_token", token);
        } else {
            localStorage.removeItem("auth_token");
        }
    }

    protected static getToken(): string | null {
        if (!ApiService.token && typeof window !== "undefined") {
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

    protected async deleteWithBody<T, D>(endpoint: string, data: D): Promise<T> {
        const response: AxiosResponse<T> =
            await this.axiosInstance.delete(endpoint, { data });
        return response.data;
    }

    protected buildQueryParams(params: Record<string, any>): URLSearchParams {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && typeof key === 'string') {
                if (Array.isArray(value)) {
                    const validArray = value.filter(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean');
                    queryParams.append(key, validArray.join(","));
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    queryParams.append(key, String(value));
                }
                // Ignore other types for security
            }
        }
        return queryParams;
    }

    protected async getPaged<T>(endpoint: string, params: Record<string, any>): Promise<T> {
        const queryParams = this.buildQueryParams(params);
        return await this.get<T>(`${endpoint}?${queryParams.toString()}`);
    }
}
