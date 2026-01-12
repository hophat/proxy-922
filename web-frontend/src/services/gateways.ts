import apiClient from './api';

export interface PublicGateway {
  id: string;
  ipMasked: string;
  portRangeStart: number;
  portRangeEnd: number;
  availablePortCount: number;
  status: string;
}

export interface GatewayPort {
  id: string;
  gatewayId: string;
  port: number;
  status: string;
}

export const gatewaysService = {
  async getGateways(): Promise<PublicGateway[]> {
    const response = await apiClient.get<PublicGateway[]>('/gateways/public');
    return response.data;
  },

  async getAvailablePorts(gatewayId: string): Promise<GatewayPort[]> {
    const response = await apiClient.get<GatewayPort[]>(
      `/gateway-ports/gateway/${gatewayId}`,
    );
    return response.data;
  },
};
