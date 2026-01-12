import { apiClient } from './api';
import type {
  User,
  Proxy,
  Gateway,
  Upstream,
  Purchase,
  PaymentOrder,
  PortMapping,
  Stats,
  ProxyStatus,
  GatewayStatus,
  UpstreamStatus,
  PurchaseStatus,
  PaymentOrderStatus,
  PortMappingStatus,
} from '../types';

export const adminService = {
  // Stats
  async getStats(): Promise<Stats> {
    return apiClient.get<Stats>('/admin/stats');
  },

  // Users
  async getUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/admin/users');
  },

  async getUser(id: string): Promise<User> {
    return apiClient.get<User>(`/admin/users/${id}`);
  },

  async updateUserQuota(id: string, quotaTotal: number): Promise<void> {
    return apiClient.put(`/admin/users/${id}/quota`, { quotaTotal });
  },

  async updateUserActive(id: string, active: boolean): Promise<void> {
    return apiClient.put(`/admin/users/${id}/active`, { active });
  },

  async resetUserQuota(id: string): Promise<void> {
    return apiClient.post(`/admin/users/${id}/reset-quota`);
  },

  // Proxies
  async getProxies(): Promise<Proxy[]> {
    return apiClient.get<Proxy[]>('/admin/proxies');
  },

  async getProxy(id: string): Promise<Proxy> {
    return apiClient.get<Proxy>(`/admin/proxies/${id}`);
  },

  async updateProxyStatus(id: string, status: ProxyStatus): Promise<void> {
    return apiClient.put(`/admin/proxies/${id}/status`, { status });
  },

  async deleteProxy(id: string): Promise<void> {
    return apiClient.delete(`/admin/proxies/${id}`);
  },

  async checkProxyHealth(id: string): Promise<any> {
    return apiClient.post(`/admin/proxies/${id}/check-health`);
  },

  async checkAllProxiesHealth(): Promise<any> {
    return apiClient.post('/admin/proxies/check-health-all');
  },

  async activateProxy(id: string): Promise<void> {
    return apiClient.post(`/admin/proxies/${id}/activate`);
  },

  async importProxies(content: string): Promise<{ imported: number; errors: string[] }> {
    return apiClient.post('/admin/proxies/import', { content });
  },

  // Gateways
  async getGateways(): Promise<Gateway[]> {
    return apiClient.get<Gateway[]>('/admin/gateways');
  },

  async getGateway(id: string): Promise<Gateway> {
    return apiClient.get<Gateway>(`/admin/gateways/${id}`);
  },

  async createGateway(data: { ip: string; portRangeStart: number; portRangeEnd: number }): Promise<Gateway> {
    return apiClient.post<Gateway>('/admin/gateways', data);
  },

  async updateGateway(id: string, data: Partial<{ ip: string; portRangeStart: number; portRangeEnd: number }>): Promise<Gateway> {
    return apiClient.put<Gateway>(`/admin/gateways/${id}`, data);
  },

  async updateGatewayStatus(id: string, status: GatewayStatus): Promise<void> {
    return apiClient.put(`/admin/gateways/${id}/status`, { status });
  },

  async deleteGateway(id: string): Promise<void> {
    return apiClient.delete(`/admin/gateways/${id}`);
  },

  // Upstreams
  async getUpstreams(params?: { status?: string; page?: number; limit?: number }): Promise<{
    data: Upstream[];
    total: number;
    page: number;
    limit: number;
  }> {
    return apiClient.get('/admin/upstreams', params);
  },

  async getUpstream(id: string): Promise<Upstream> {
    return apiClient.get<Upstream>(`/admin/upstreams/${id}`);
  },

  async createUpstream(data: { host: string; port: number; username?: string; password?: string }): Promise<Upstream> {
    return apiClient.post<Upstream>('/admin/upstreams', data);
  },

  async importUpstreams(content: string): Promise<{ imported: number; errors: string[] }> {
    return apiClient.post('/admin/upstreams/import', { content });
  },

  async updateUpstream(id: string, data: Partial<{ host: string; port: number; username?: string; password?: string }>): Promise<Upstream> {
    return apiClient.put<Upstream>(`/admin/upstreams/${id}`, data);
  },

  async updateUpstreamStatus(id: string, status: UpstreamStatus): Promise<void> {
    return apiClient.put(`/admin/upstreams/${id}/status`, { status });
  },

  async checkUpstreamGeo(id: string): Promise<any> {
    return apiClient.post(`/admin/upstreams/${id}/check-geo`);
  },

  async checkAllUpstreamsGeo(): Promise<any> {
    return apiClient.post('/admin/upstreams/check-geo-all');
  },

  async deleteUpstream(id: string): Promise<void> {
    return apiClient.delete(`/admin/upstreams/${id}`);
  },

  // Purchases
  async getPurchases(params?: { userId?: string; status?: string }): Promise<Purchase[]> {
    return apiClient.get<Purchase[]>('/admin/purchases', params);
  },

  async getPurchase(id: string): Promise<Purchase> {
    return apiClient.get<Purchase>(`/admin/purchases/${id}`);
  },

  async updatePurchaseStatus(id: string, status: PurchaseStatus): Promise<void> {
    return apiClient.put(`/admin/purchases/${id}/status`, { status });
  },

  async expirePurchase(id: string): Promise<void> {
    return apiClient.post(`/admin/purchases/${id}/expire`);
  },

  // Payments
  async getPayments(params?: { userId?: string; status?: string }): Promise<PaymentOrder[]> {
    return apiClient.get<PaymentOrder[]>('/admin/payments', params);
  },

  async getPayment(id: string): Promise<PaymentOrder> {
    return apiClient.get<PaymentOrder>(`/admin/payments/${id}`);
  },

  async updatePaymentStatus(id: string, status: PaymentOrderStatus): Promise<void> {
    return apiClient.put(`/admin/payments/${id}/status`, { status });
  },

  // Port Mappings
  async getPortMappings(params?: { userId?: string; gatewayId?: string; status?: string }): Promise<PortMapping[]> {
    return apiClient.get<PortMapping[]>('/admin/port-mappings', params);
  },

  async getPortMapping(id: string): Promise<PortMapping> {
    return apiClient.get<PortMapping>(`/admin/port-mappings/${id}`);
  },

  async updatePortMappingStatus(id: string, status: PortMappingStatus): Promise<void> {
    return apiClient.put(`/admin/port-mappings/${id}/status`, { status });
  },

  async releasePortMapping(id: string): Promise<void> {
    return apiClient.post(`/admin/port-mappings/${id}/release`);
  },
};
