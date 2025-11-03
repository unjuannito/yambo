import { ApiService } from './apiService';
import type { User } from '../types/userType';

export class UserService extends ApiService {
  public async getCurrentUser(): Promise<User> {
    // return await this.get<User>('/user/me');
    return {
      "id": "aow72ksd",
      "email": "juancanx2@gmail.com",
      "name": "Juan",
      "roles": [],
      "permissions": ["nothing", "users_read"],
    }
  }
}
