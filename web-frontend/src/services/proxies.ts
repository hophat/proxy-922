import apiClient from './api';

export interface PublicProxy {
  id: string;
  host: string;
  port: number;
  status: string;
  lastCheck?: string;
  consecutiveFailures: number;
}

export const proxiesService = {
  async getPublicProxies(): Promise<PublicProxy[]> {
    const response = await apiClient.get<PublicProxy[]>('/proxies/public');
    return response.data;
  },
};
