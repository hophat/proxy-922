import axios, { AxiosInstance, AxiosError } from "axios";
import { ADMIN_BASE_PATH } from "../constants/routes";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3300";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("admin_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem("admin_token");
          window.location.href = `${ADMIN_BASE_PATH}/login`;
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return apiClient.post<{ token: string; user: any }>("/auth/login", {
      email,
      password,
    });
  },
};

// Admin API
export const adminApi = {
  // Stats
  getStats: () => apiClient.get("/admin/stats"),

  // Users
  getUsers: () => apiClient.get("/admin/users"),
  getUser: (id: string) => apiClient.get(`/admin/users/${id}`),
  updateUserQuota: (id: string, quotaTotal: number) =>
    apiClient.put(`/admin/users/${id}/quota`, { quotaTotal }),
  updateUserActive: (id: string, active: boolean) =>
    apiClient.put(`/admin/users/${id}/active`, { active }),
  resetUserQuota: (id: string) =>
    apiClient.post(`/admin/users/${id}/reset-quota`),

  // Proxies
  getProxies: () => apiClient.get("/admin/proxies"),
  getProxy: (id: string) => apiClient.get(`/admin/proxies/${id}`),
  updateProxyStatus: (id: string, status: string) =>
    apiClient.put(`/admin/proxies/${id}/status`, { status }),
  deleteProxy: (id: string) => apiClient.delete(`/admin/proxies/${id}`),
  checkProxyHealth: (id: string) =>
    apiClient.post(`/admin/proxies/${id}/check-health`),
  checkAllProxiesHealth: () =>
    apiClient.post("/admin/proxies/check-health-all"),
  activateProxy: (id: string) =>
    apiClient.post(`/admin/proxies/${id}/activate`),
  importProxies: (content: string) =>
    apiClient.post("/admin/proxies/import", { content }),

  // Gateways
  getGateways: () => apiClient.get("/admin/gateways"),
  getGateway: (id: string) => apiClient.get(`/admin/gateways/${id}`),
  createGateway: (data: {
    ip: string;
    portRangeStart: number;
    portRangeEnd: number;
  }) => apiClient.post("/admin/gateways", data),
  updateGateway: (id: string, data: any) =>
    apiClient.put(`/admin/gateways/${id}`, data),
  updateGatewayStatus: (id: string, status: string) =>
    apiClient.put(`/admin/gateways/${id}/status`, { status }),
  deleteGateway: (id: string) => apiClient.delete(`/admin/gateways/${id}`),

  // Upstreams
  getUpstreams: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/admin/upstreams", params),
  getUpstream: (id: string) => apiClient.get(`/admin/upstreams/${id}`),
  createUpstream: (data: { host: string; port: number; username?: string; password?: string }) =>
    apiClient.post("/admin/upstreams", data),
  importUpstreams: (content: string) =>
    apiClient.post("/admin/upstreams/import", { content }),
  updateUpstream: (id: string, data: any) =>
    apiClient.put(`/admin/upstreams/${id}`, data),
  updateUpstreamStatus: (id: string, status: string) =>
    apiClient.put(`/admin/upstreams/${id}/status`, { status }),
  checkUpstreamGeo: (id: string) =>
    apiClient.post(`/admin/upstreams/${id}/check-geo`),
  checkAllUpstreamsGeo: () =>
    apiClient.post("/admin/upstreams/check-geo-all"),
  deleteUpstream: (id: string) => apiClient.delete(`/admin/upstreams/${id}`),

  // Purchases
  getPurchases: (params?: { userId?: string; status?: string }) =>
    apiClient.get("/admin/purchases", params),
  getPurchase: (id: string) => apiClient.get(`/admin/purchases/${id}`),
  updatePurchaseStatus: (id: string, status: string) =>
    apiClient.put(`/admin/purchases/${id}/status`, { status }),
  expirePurchase: (id: string) =>
    apiClient.post(`/admin/purchases/${id}/expire`),

  // Payments
  getPayments: (params?: { userId?: string; status?: string }) =>
    apiClient.get("/admin/payments", params),
  getPayment: (id: string) => apiClient.get(`/admin/payments/${id}`),
  updatePaymentStatus: (id: string, status: string) =>
    apiClient.put(`/admin/payments/${id}/status`, { status }),

  // Port Mappings
  getPortMappings: (params?: {
    userId?: string;
    gatewayId?: string;
    status?: string;
  }) => apiClient.get("/admin/port-mappings", params),
  getPortMapping: (id: string) => apiClient.get(`/admin/port-mappings/${id}`),
  updatePortMappingStatus: (id: string, status: string) =>
    apiClient.put(`/admin/port-mappings/${id}/status`, { status }),
  releasePortMapping: (id: string) =>
    apiClient.post(`/admin/port-mappings/${id}/release`),
};
