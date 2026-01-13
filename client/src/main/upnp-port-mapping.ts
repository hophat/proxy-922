/**
 * UPnP/NAT-PMP Port Mapping Utility
 * Tự động mở port trên router firewall mà không cần cấu hình thủ công
 */

interface PortMapping {
  port: number;
  protocol: 'TCP' | 'UDP';
  description?: string;
}

interface UPnPClient {
  map(port: number, callback: (err?: Error) => void): void;
  map(options: { publicPort: number; privatePort: number; protocol?: string; ttl?: number }, callback: (err?: Error) => void): void;
  unmap(port: number, callback: (err?: Error) => void): void;
  externalIp(callback: (err: Error | null, ip?: string) => void): void;
  destroy(callback?: () => void): void;
}

// Lazy load nat-api để tránh lỗi nếu không cài
let NatAPI: any = null;
let isUPnPAvailable = false;

try {
  // Thử import nat-api
  NatAPI = require('nat-api');
  isUPnPAvailable = true;
} catch (err) {
  console.log('[UPnP] nat-api not available, UPnP disabled');
  isUPnPAvailable = false;
}

class UPnPPortMapper {
  private client: UPnPClient | null = null;
  private mappedPorts: Set<number> = new Set();
  private initialized: boolean = false;

  /**
   * Initialize UPnP client
   */
  async initialize(): Promise<boolean> {
    if (!isUPnPAvailable || this.initialized) {
      return this.initialized;
    }

    try {
      if (!NatAPI) {
        // Try dynamic import
        NatAPI = require('nat-api');
      }

      // Create NatAPI client (no options needed, uses defaults)
      this.client = new NatAPI();

      // Test connection by getting external IP
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Client not initialized'));
          return;
        }

        this.client.externalIp((err: Error | null) => {
          if (err) {
            console.warn('[UPnP] Failed to get external IP, UPnP may not be supported:', err.message);
            reject(err);
          } else {
            console.log('[UPnP] UPnP client initialized successfully');
            this.initialized = true;
            resolve();
          }
        });
      });

      return true;
    } catch (err: any) {
      console.warn('[UPnP] UPnP initialization failed:', err.message);
      console.warn('[UPnP] Router may not support UPnP/NAT-PMP, port mapping will be skipped');
      this.initialized = false;
      return false;
    }
  }

  /**
   * Map a port (open port on router)
   */
  async mapPort(mapping: PortMapping): Promise<boolean> {
    if (!this.initialized || !this.client) {
      console.log(`[UPnP] Port mapping skipped for ${mapping.port}/${mapping.protocol} (UPnP not available)`);
      return false;
    }

    if (this.mappedPorts.has(mapping.port)) {
      console.log(`[UPnP] Port ${mapping.port} already mapped`);
      return true;
    }

    try {
      return new Promise<boolean>((resolve) => {
        if (!this.client) {
          resolve(false);
          return;
        }

        // Map port: nat-api maps both TCP and UDP by default
        // To map only TCP, we can use: client.map({ publicPort: port, privatePort: port, protocol: 'TCP' }, callback)
        const mapCallback = (err?: Error) => {
          if (err) {
            console.warn(`[UPnP] Failed to map port ${mapping.port}:`, err.message);
            resolve(false);
          } else {
            this.mappedPorts.add(mapping.port);
            console.log(`[UPnP] Successfully mapped port ${mapping.port}/${mapping.protocol}${mapping.description ? ` (${mapping.description})` : ''}`);
            resolve(true);
          }
        };

        // Use options object for TCP protocol, or simple port number for both TCP and UDP
        if (mapping.protocol === 'TCP') {
          this.client.map({ publicPort: mapping.port, privatePort: mapping.port, protocol: 'TCP' }, mapCallback);
        } else {
          this.client.map(mapping.port, mapCallback);
        }
      });
    } catch (err: any) {
      console.warn(`[UPnP] Error mapping port ${mapping.port}:`, err.message);
      return false;
    }
  }

  /**
   * Unmap a port (close port on router)
   */
  async unmapPort(port: number): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    if (!this.mappedPorts.has(port)) {
      return true;
    }

    try {
      return new Promise<boolean>((resolve) => {
        if (!this.client) {
          resolve(false);
          return;
        }

        this.client.unmap(port, (err?: Error) => {
          if (err) {
            console.warn(`[UPnP] Failed to unmap port ${port}:`, err.message);
            resolve(false);
          } else {
            this.mappedPorts.delete(port);
            console.log(`[UPnP] Successfully unmapped port ${port}`);
            resolve(true);
          }
        });
      });
    } catch (err: any) {
      console.warn(`[UPnP] Error unmapping port ${port}:`, err.message);
      return false;
    }
  }

  /**
   * Get external IP address
   */
  async getExternalIP(): Promise<string | null> {
    if (!this.initialized || !this.client) {
      return null;
    }

    try {
      return new Promise<string | null>((resolve) => {
        if (!this.client) {
          resolve(null);
          return;
        }

        this.client.externalIp((err: Error | null, ip?: string) => {
          if (err || !ip) {
            resolve(null);
          } else {
            resolve(ip);
          }
        });
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Unmap all ports and cleanup
   */
  async cleanup(): Promise<void> {
    const ports = Array.from(this.mappedPorts);
    for (const port of ports) {
      await this.unmapPort(port);
    }

    if (this.client) {
      return new Promise<void>((resolve) => {
        this.client!.destroy(() => {
          this.client = null;
          this.initialized = false;
          console.log('[UPnP] UPnP client destroyed');
          resolve();
        });
      });
    }
  }

  /**
   * Check if UPnP is available and initialized
   */
  isAvailable(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const upnpPortMapper = new UPnPPortMapper();

/**
 * Initialize UPnP (should be called on app start)
 */
export async function initializeUPnP(): Promise<boolean> {
  return upnpPortMapper.initialize();
}

/**
 * Map a port automatically (open on router)
 */
export async function mapPort(port: number, protocol: 'TCP' | 'UDP' = 'TCP', description?: string): Promise<boolean> {
  return upnpPortMapper.mapPort({ port, protocol, description });
}

/**
 * Unmap a port (close on router)
 */
export async function unmapPort(port: number): Promise<boolean> {
  return upnpPortMapper.unmapPort(port);
}

/**
 * Cleanup all port mappings (should be called on app exit)
 */
export async function cleanupUPnP(): Promise<void> {
  return upnpPortMapper.cleanup();
}
