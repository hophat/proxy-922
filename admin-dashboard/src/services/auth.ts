import { apiClient } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('admin_token', response.token);
    }
    return response;
  },

  logout(): void {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
  },

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
