import { ApiService } from './apiService';
import type { CurrentUser } from '../types/userType';

export class UserService extends ApiService {
  public async getCurrentUser(): Promise<CurrentUser> {
    return await this.get<CurrentUser>('/user/me');
  }
}
