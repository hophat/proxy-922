import apiClient from './api';

export interface PublicUpstream {
  id: string;
  host: string; // IP đã được mask (ví dụ: 192.168.***.***)
  port: number;
  country?: string;
  state?: string;
  city?: string;
  ping?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const upstreamsService = {
  async getAvailableUpstreams(): Promise<PublicUpstream[]> {
    const response = await apiClient.get<PublicUpstream[]>(
      '/socks5-upstream/public/available',
    );
    return response.data;
  },
};
