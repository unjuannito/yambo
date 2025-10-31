import { ApiService } from './apiService';
import type { User } from '../types/userType';

export class UserService extends ApiService {
  public async getCurrentUser(): Promise<User> {
    return await this.get<User>('/user/me');
  }
}
