import apiClient from './api';

export enum PurchaseDuration {
  HOURS_24 = '24h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
}

export interface CreatePurchaseDto {
  gatewayId: string;
  portCount: number;
  duration: PurchaseDuration;
}

export interface PurchaseResponse {
  purchaseId: string;
  gateway: {
    id: string;
    ip: string;
    portRangeStart: number;
    portRangeEnd: number;
  };
  ports: Array<{
    id: string;
    port: number;
    mappingId: string;
  }>;
  credentials: {
    username: string;
    password: string;
  };
  expiresAt: string;
  duration: PurchaseDuration;
}

export interface Purchase {
  id: string;
  userId: string;
  gatewayId: string;
  portId: string;
  mappingId: string;
  purchasedAt: string;
  expiresAt: string;
  duration: PurchaseDuration;
  price: number;
  status: string;
  gatewayUsername: string;
  gatewayPassword: string;
  gateway?: {
    id: string;
    ip: string;
  };
  port?: {
    id: string;
    port: number;
  };
}

export const purchasesService = {
  async createPurchase(
    gatewayId: string,
    portCount: number,
    duration: PurchaseDuration,
  ): Promise<PurchaseResponse> {
    const response = await apiClient.post<PurchaseResponse>('/purchases', {
      gatewayId,
      portCount,
      duration,
    });
    return response.data;
  },

  async createUpstreamPurchase(
    upstreamIds: string[],
    gatewayId: string,
    duration: PurchaseDuration,
  ): Promise<PurchaseResponse> {
    const response = await apiClient.post<PurchaseResponse>('/purchases/upstream', {
      upstreamIds,
      gatewayId,
      duration,
    });
    return response.data;
  },

  async getMyPurchases(): Promise<Purchase[]> {
    const response = await apiClient.get<Purchase[]>('/purchases/my');
    return response.data;
  },

  async getPurchaseById(purchaseId: string): Promise<Purchase> {
    const response = await apiClient.get<Purchase>(`/purchases/${purchaseId}`);
    return response.data;
  },
};
