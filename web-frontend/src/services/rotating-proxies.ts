import apiClient from './api';
import { PurchaseDuration } from './purchases';

export interface CreateRotatingProxyOrderDto {
  proxyCount: number;
  duration: PurchaseDuration;
}

export interface PaymentOrderResponse {
  id: string;
  orderCode: string;
  amount: number;
  status: string;
  qrCodeUrl: string | null;
  vaNumber: string | null;
  accountName: string | null;
  expiredAt: string;
  createdAt: string;
}

export interface RotatingProxyResponse {
  id: string;
  domain: string;
  ip: string;
  port: number | null;
  expiresAt: string;
  duration: PurchaseDuration;
  status: string;
}

export const rotatingProxiesService = {
  async createOrder(
    proxyCount: number,
    duration: PurchaseDuration,
  ): Promise<PaymentOrderResponse> {
    const response = await apiClient.post<PaymentOrderResponse>('/rotating-proxy/order', {
      proxyCount,
      duration,
    });
    return response.data;
  },

  async getMyRotatingProxies(): Promise<RotatingProxyResponse[]> {
    const response = await apiClient.get<RotatingProxyResponse[]>('/rotating-proxy/my');
    return response.data;
  },

  async getRotatingProxyById(id: string): Promise<RotatingProxyResponse> {
    const response = await apiClient.get<RotatingProxyResponse>(`/rotating-proxy/${id}`);
    return response.data;
  },

  async updatePort(id: string, port: number): Promise<RotatingProxyResponse> {
    const response = await apiClient.put<RotatingProxyResponse>(`/rotating-proxy/${id}/port`, {
      port,
    });
    return response.data;
  },
};
