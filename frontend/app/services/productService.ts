import { ApiService } from './apiService';

export interface ProductOption {
  name: string
    type: "select" | "checkbox" | "text_input"
  values?: OptionValue[]
  required?: boolean
  price?: number
  dependencies?: OptionDependency[]
  conditions?: OptionCondition[]
  description?: string
}

export interface OptionValue {
  id: string
  label: string
  price?: number
  photo?: string
  meta?: Record<string, any>
}

export interface OptionDependency {
  depends_on: string
  required_for?: string[]
  action?: "disable" | "hide"
}

export interface OptionCondition {
  when: string
  is?: string | string[]
  then?: "show" | "hide" | "enable" | "disable"
}

export interface Product {
    id: string;
    name: string;
    projectId: string | null;
    familyProductId: string | null;
    active: boolean;
    basePrice: number;
    options: ProductOption[];
    images?: string[];
}

export interface CreateProductRequest {
    name: string;
    projectId?: string;
    familyProductId?: string;
    basePrice: number;
    options?: ProductOption[];
    images?: string[];
}

export interface UpdateProductRequest {
    name?: string;
    active?: boolean;
    images?: string[];
    options?: ProductOption[];
    basePrice?: number;
    familyProductId?: string;
    projectId?: string;
}

export class ProductService extends ApiService {
    public async getAllProducts(page = 0, size = 20, name?: string, active?: boolean): Promise<{ content: Product[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
        const params = new URLSearchParams({
            page: page.toString(),
            size: size.toString(),
        });
        if (name) params.append('name', name);
        if (active !== undefined) params.append('active', active.toString());

        const response = await this.get<{ content: any[]; page: { totalElements: number; totalPages: number; number: number; size: number } }>(`/products?${params}`);

        // Parse options JSON string to ProductOption[]
        const products: Product[] = response.content.map(product => ({
            ...product,
            options: this.parseOptions(product.options),
            images: this.parseImages(product.images)
        }));

        return { ...response, content: products };
    }

    public async getProduct(id: string): Promise<Product> {
        const product = await this.get<any>(`/products/${id}`);
        return {
            ...product,
            options: this.parseOptions(product.options),
            images: this.parseImages(product.images)
        };
    }

    public async createProduct(request: CreateProductRequest): Promise<Product> {
        const payload: CreateProductRequest = {
            ...request,
            options: this.normalizeOptions((request as any).options),
            images: this.normalizeImages((request as any).images),
        };

        const product = await this.post<any, CreateProductRequest>('/products', payload);
        return {
            ...product,
            options: this.parseOptions(product.options),
            images: this.parseImages(product.images)
        };
    }

    public async updateProduct(id: string, request: UpdateProductRequest): Promise<Product> {
        const payload: UpdateProductRequest = {
            ...request,
            options: request.options === undefined ? undefined : this.normalizeOptions((request as any).options),
            images: request.images === undefined ? undefined : this.normalizeImages((request as any).images),
        };

        const product = await this.put<any, UpdateProductRequest>(`/products/${id}`, payload);
        return {
            ...product,
            options: this.parseOptions(product.options),
            images: this.parseImages(product.images)
        };
    }

    public async deleteProduct(id: string): Promise<void> {
        return await this.delete<void>(`/products/${id}`);
    }

    public async getProductById(id: string): Promise<Product> {
        const response = await this.get<any>(`/products/${id}`);
        return {
            ...response,
            options: this.parseOptions(response.options),
            images: this.parseImages(response.images)
        };
    }

    public async getProductPrice(id: string): Promise<{ basePrice: number; finalPrice: number }> {
        return await this.get<{ basePrice: number; finalPrice: number }>(`/products/${id}/price`);
    }

    private parseOptions(options: any): ProductOption[] {
        if (Array.isArray(options)) {
            return options;
        }
        if (typeof options === 'string') {
            try {
                return JSON.parse(options || '[]');
            } catch {
                return [];
            }
        }
        return [];
    }

    private parseImages(images: any): string[] {
        if (Array.isArray(images)) {
            return images;
        }
        if (typeof images === 'string') {
            try {
                return JSON.parse(images || '[]');
            } catch {
                return [];
            }
        }
        return [];
    }

    private normalizeOptions(options: any): ProductOption[] {
        if (options === undefined || options === null) {
            return [];
        }
        return this.parseOptions(options);
    }

    private normalizeImages(images: any): string[] {
        if (images === undefined || images === null) {
            return [];
        }
        return this.parseImages(images);
    }
}

export const productService = new ProductService();