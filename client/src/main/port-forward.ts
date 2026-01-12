import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { createConnectionWithMapping } from './connection';
import { startPortForwardServer } from './proxy-server';

export interface PortMapping {
  mappingId: string;
  gatewayIp: string;
  gatewayPort: number;
  localPort: number; // Port trên local machine (10000-20000)
  username: string;
  password: string;
  upstreamId: string;
  upstreamHost: string;
  upstreamPort: number;
  status: string;
  expiresAt: string;
}

interface MappingsResponse {
  mappings: PortMapping[];
}

class PortForwardManager {
  private activeForwards: Map<string, net.Server> = new Map();
  private backendURL: string;
  private gatewayHost: string;
  private gatewayPort: number;

  constructor(backendURL: string, gatewayHost: string, gatewayPort: number) {
    this.backendURL = backendURL;
    this.gatewayHost = gatewayHost;
    this.gatewayPort = gatewayPort;
  }

  private async httpRequest(url: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const requestOptions: http.RequestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        };

        const req = client.request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                reject(new Error('Failed to parse response'));
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async refreshMappings(token: string): Promise<PortMapping[]> {
    try {
      const response = await this.httpRequest(
        `${this.backendURL}/purchases/my/mappings`,
        token,
      ) as MappingsResponse;
      return response.mappings || [];
    } catch (error) {
      console.error('[PortForward] Failed to refresh mappings:', error);
      throw error;
    }
  }

  async startPortForward(mapping: PortMapping, token: string): Promise<void> {
    // Check if already running
    if (this.activeForwards.has(mapping.mappingId)) {
      console.log(`[PortForward] Port forward for ${mapping.mappingId} is already running`);
      return;
    }

    // Check if port is already in use
    const portInUse = Array.from(this.activeForwards.values()).some((server) => {
      const address = server.address();
      if (address && typeof address === 'object' && 'port' in address) {
        return address.port === mapping.localPort;
      }
      return false;
    });

    if (portInUse) {
      throw new Error(`Port ${mapping.localPort} is already in use`);
    }

    try {
      const server = await startPortForwardServer(
        mapping,
        token,
        this.gatewayHost,
        this.gatewayPort,
      );
      this.activeForwards.set(mapping.mappingId, server);
      console.log(`[PortForward] Started port forward: ${mapping.localPort} -> ${mapping.mappingId}`);
    } catch (error) {
      console.error(`[PortForward] Failed to start port forward for ${mapping.mappingId}:`, error);
      throw error;
    }
  }

  async stopPortForward(mappingId: string): Promise<void> {
    const server = this.activeForwards.get(mappingId);
    if (!server) {
      console.log(`[PortForward] Port forward for ${mappingId} is not running`);
      return;
    }

    return new Promise((resolve) => {
      server.close(() => {
        this.activeForwards.delete(mappingId);
        console.log(`[PortForward] Stopped port forward: ${mappingId}`);
        resolve();
      });
    });
  }

  listActivePortForwards(): string[] {
    return Array.from(this.activeForwards.keys());
  }

  async startAllPortForwards(mappings: PortMapping[], token: string): Promise<void> {
    const errors: Error[] = [];

    for (const mapping of mappings) {
      if (mapping.status === 'active') {
        try {
          await this.startPortForward(mapping, token);
        } catch (error) {
          console.error(`[PortForward] Failed to start port forward for ${mapping.mappingId}:`, error);
          errors.push(error as Error);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to start ${errors.length} port forward(s)`);
    }
  }

  async stopAllPortForwards(): Promise<void> {
    const mappingIds = Array.from(this.activeForwards.keys());
    await Promise.all(mappingIds.map((id) => this.stopPortForward(id)));
  }
}

// Singleton instance
let portForwardManager: PortForwardManager | null = null;

export function getPortForwardManager(backendURL: string, gatewayHost: string, gatewayPort: number): PortForwardManager {
  if (!portForwardManager) {
    portForwardManager = new PortForwardManager(backendURL, gatewayHost, gatewayPort);
  }
  return portForwardManager;
}
