import apiClient from './api';

export enum RotationInterval {
  MINUTES_5 = 5,
  MINUTES_15 = 15,
  MINUTES_60 = 60,
}

export enum PurchaseDuration {
  HOURS_24 = '24h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
}

export interface RotatingProxyPackage {
  id: string;
  rotationInterval: RotationInterval;
  price: number;
  description?: string;
}

export interface CreateRotatingProxyPurchaseDto {
  rotationInterval: RotationInterval;
  duration: PurchaseDuration;
}

export interface RotatingProxyPurchaseResponse {
  purchaseId: string;
  domain: string;
  apiKey: string;
  rotationInterval: RotationInterval;
  duration: PurchaseDuration;
  expiresAt: string;
  price: number;
}

export interface RotatingProxyPurchase {
  id: string;
  userId: string;
  rotationInterval: RotationInterval;
  duration: PurchaseDuration;
  domain: string;
  apiKey: string;
  purchasedAt: string;
  expiresAt: string;
  price: number;
  status: string;
}

export const rotatingProxiesService = {
  async getPackages(): Promise<RotatingProxyPackage[]> {
    const response = await apiClient.get<RotatingProxyPackage[]>('/rotating-proxy/packages');
    return response.data;
  },

  async createPurchase(
    rotationInterval: RotationInterval,
    duration: PurchaseDuration,
  ): Promise<RotatingProxyPurchaseResponse> {
    const response = await apiClient.post<RotatingProxyPurchaseResponse>('/rotating-proxy/purchase', {
      rotationInterval,
      duration,
    });
    return response.data;
  },

  async getMyPurchases(): Promise<RotatingProxyPurchase[]> {
    const response = await apiClient.get<RotatingProxyPurchase[]>('/rotating-proxy/my-purchases');
    return response.data;
  },

  async getPurchaseById(purchaseId: string): Promise<RotatingProxyPurchase> {
    const response = await apiClient.get<RotatingProxyPurchase>(`/rotating-proxy/purchases/${purchaseId}`);
    return response.data;
  },
};
