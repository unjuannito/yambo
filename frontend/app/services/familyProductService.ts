import { ApiService } from './apiService';

export interface FamilyProduct {
  id: string;
  name: string;
  startTms: string;
  endTms: string;
  status?: string;
  active?: boolean;
  profileId?: string | null;
  projectIds?: string[];
}

export interface CreateFamilyProductRequest {
  name: string;
  startTms: string;
  endTms: string;
  projectIds?: string[];
}

export interface UpdateFamilyProductRequest {
  name?: string;
  startTms?: string;
  endTms?: string;
  projectIds?: string[];
}

export class FamilyProductService extends ApiService {
  public async listFamilyProducts(
    page = 0,
    size = 50,
    name?: string,
    active?: boolean,
    profileId?: string
  ): Promise<{ content: FamilyProduct[]; page: { totalElements: number; totalPages: number; number: number; size: number } }> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (name) params.append('name', name);
    if (active !== undefined) params.append('active', active.toString());
    if (profileId) params.append('profileId', profileId);

    return await this.get(`/family-products?${params.toString()}`);
  }

  public async getFamilyProduct(id: string): Promise<FamilyProduct> {
    return await this.get(`/family-products/${id}`);
  }

  public async createFamilyProduct(request: CreateFamilyProductRequest): Promise<FamilyProduct> {
    return await this.post('/family-products', request);
  }

  public async updateFamilyProduct(id: string, request: UpdateFamilyProductRequest): Promise<FamilyProduct> {
    return await this.put(`/family-products/${id}`, request);
  }

  public async assignProjects(id: string, projectIds: string[]): Promise<FamilyProduct> {
    return await this.put(`/family-products/${id}/projects`, { projectIds });
  }

  public async deleteFamilyProduct(id: string): Promise<void> {
    return await this.delete(`/family-products/${id}`);
  }

  public async updateFamilyProductStatus(id: string, status: string): Promise<FamilyProduct> {
    return await this.put(`/family-products/${id}/status`, { status });
  }
}

export const familyProductService = new FamilyProductService();
