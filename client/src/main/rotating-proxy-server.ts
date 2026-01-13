import * as net from 'net';
import { createConnection } from './connection';
import * as auth from './auth';
import { getLocalIP } from './public-ip';
import { mapPort, unmapPort } from './upnp-port-mapping';

// Import helper functions from proxy-server to ensure same logic
// These are not exported, so we need to duplicate them or make them shared
// For now, we'll keep them here but ensure they match proxy-server.ts exactly

const GATEWAY_HOST = process.env.GATEWAY_HOST || '14.225.254.130';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '8880', 10);

interface RotatingProxyServer {
  id: string;
  port: number;
  server: net.Server;
  isRunning: boolean;
  upnpMapped: boolean; // Track if port was mapped via UPnP
}

class RotatingProxyServerManager {
  private servers: Map<string, RotatingProxyServer> = new Map();

  /**
   * Start a SOCKS5 server for a rotating proxy on the specified port
   * Server listens on 0.0.0.0 to accept connections from any interface (including mobile devices)
   */
  async startServer(id: string, port: number): Promise<void> {
    // Stop existing server if any
    await this.stopServer(id);

    return new Promise((resolve, reject) => {
      const token = auth.getToken();
      if (!token) {
        reject(new Error('Not authenticated'));
        return;
      }

      const server = net.createServer((clientSocket) => {
        this.handleSocks5Connection(clientSocket, token, GATEWAY_HOST, GATEWAY_PORT);
      });

      // Listen on network interface IP to allow connections from other devices
      const listenIP = getLocalIP();
      server.listen(port, listenIP, async () => {
        // Try to automatically open port on router via UPnP (non-blocking)
        let upnpMapped = false;
        try {
          upnpMapped = await mapPort(port, 'TCP', `Rotating Proxy ${id}`);
          if (upnpMapped) {
            console.log(`[RotatingProxy] Port ${port} automatically opened on router via UPnP`);
          }
        } catch (err: any) {
          // UPnP failed, but server still works in local network
          console.log(`[RotatingProxy] UPnP port mapping failed (non-critical): ${err.message}`);
        }

        const proxyServer: RotatingProxyServer = {
          id,
          port,
          server,
          isRunning: true,
          upnpMapped,
        };
        this.servers.set(id, proxyServer);
        console.log(`[RotatingProxy] SOCKS5 server started for proxy ${id} on ${listenIP}:${port}`);
        resolve();
      });

      server.on('error', (err) => {
        console.error(`[RotatingProxy] Server error on port ${port}:`, err);
        this.servers.delete(id);
        reject(err);
      });
    });
  }

  /**
   * Stop a rotating proxy server
   */
  async stopServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      return;
    }

    // Unmap port from router if it was mapped via UPnP
    if (server.upnpMapped) {
      try {
        await unmapPort(server.port);
        console.log(`[RotatingProxy] Port ${server.port} automatically closed on router via UPnP`);
      } catch (err: any) {
        console.warn(`[RotatingProxy] Failed to unmap port ${server.port} via UPnP:`, err.message);
      }
    }

    return new Promise((resolve) => {
      server.server.close(() => {
        console.log(`[RotatingProxy] Server stopped for proxy ${id} on port ${server.port}`);
        this.servers.delete(id);
        resolve();
      });
    });
  }

  /**
   * Stop all rotating proxy servers
   */
  async stopAllServers(): Promise<void> {
    const promises = Array.from(this.servers.keys()).map((id) => this.stopServer(id));
    await Promise.all(promises);
  }

  /**
   * Check if a server is running for a proxy
   */
  isServerRunning(id: string): boolean {
    const server = this.servers.get(id);
    return server?.isRunning || false;
  }

  /**
   * Get all running servers
   */
  getRunningServers(): Array<{ id: string; port: number }> {
    return Array.from(this.servers.values()).map((s) => ({
      id: s.id,
      port: s.port,
    }));
  }

  /**
   * Handle SOCKS5 connection for rotating proxy
   * Same logic as port forward but without mappingId (rotation mode)
   */
  private async handleSocks5Connection(
    clientSocket: net.Socket,
    token: string,
    gatewayHost: string,
    gatewayPort: number,
  ) {
    try {
      console.log('[RotatingProxy] New SOCKS5 connection');
      
      // SOCKS5 handshake
      const handshake = await this.performSocks5Handshake(clientSocket);
      if (!handshake) {
        console.error('[RotatingProxy] SOCKS5 handshake failed');
        clientSocket.destroy();
        return;
      }
      console.log('[RotatingProxy] SOCKS5 handshake successful');

      // Read SOCKS5 request and parse target address
      const targetInfo = await this.readSocks5Request(clientSocket);
      if (!targetInfo) {
        console.error('[RotatingProxy] Failed to read SOCKS5 request');
        clientSocket.destroy();
        return;
      }
      console.log(`[RotatingProxy] SOCKS5 request: ${targetInfo.host}:${targetInfo.port}`);

      // Connect to gateway (rotation mode - no mappingId)
      console.log(`[RotatingProxy] Connecting to gateway ${gatewayHost}:${gatewayPort}`);
      const gatewaySocket = await createConnection(token, gatewayHost, gatewayPort);
      if (!gatewaySocket) {
        console.error('[RotatingProxy] Failed to connect to gateway');
        clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        clientSocket.destroy();
        return;
      }
      console.log('[RotatingProxy] Connected to gateway');

      // Send SOCKS5 CONNECT request
      const socks5Request = this.buildSocks5Request(targetInfo.host, targetInfo.port);
      console.log(`[RotatingProxy] Sending SOCKS5 request to gateway: ${targetInfo.host}:${targetInfo.port}`);
      
      gatewaySocket.setNoDelay(true);
      const allDataWritten = gatewaySocket.write(socks5Request);
      
      if (!allDataWritten) {
        await new Promise(resolve => {
          gatewaySocket.once('drain', resolve);
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));

      // Read gateway response
      try {
        gatewaySocket.setTimeout(5000);
        const responseData = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          let totalLength = 0;
          
          const onData = (data: Buffer) => {
            chunks.push(data);
            totalLength += data.length;
            
            const combined = Buffer.concat(chunks);
            const responseStr = combined.toString('utf-8', 0, Math.min(combined.length, 50));
            
            if (responseStr.startsWith('ERROR:')) {
              gatewaySocket.removeListener('data', onData);
              resolve(combined);
              return;
            }
            
            if (combined[0] === 0x05 && totalLength >= 10) {
              gatewaySocket.removeListener('data', onData);
              resolve(combined);
              return;
            }
            
            if (totalLength > 256) {
              gatewaySocket.removeListener('data', onData);
              resolve(combined);
              return;
            }
          };
          
          gatewaySocket.on('data', onData);
          gatewaySocket.once('error', (err) => {
            gatewaySocket.removeListener('data', onData);
            reject(err);
          });
          gatewaySocket.once('timeout', () => {
            gatewaySocket.removeListener('data', onData);
            reject(new Error('Timeout waiting for gateway response'));
          });
        });

        const responseStr = responseData.toString('utf-8', 0, Math.min(responseData.length, 50));
        if (responseStr.startsWith('ERROR:')) {
          console.error('[RotatingProxy] Gateway error:', responseStr.trim());
          clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
          clientSocket.destroy();
          gatewaySocket.destroy();
          return;
        }

        if (responseData[0] === 0x05) {
          const socks5Response = responseData.slice(0, 10);
          clientSocket.write(socks5Response);
        } else {
          clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        }
      } catch (err) {
        console.error('[RotatingProxy] Error reading gateway response:', err);
        clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
      }

      gatewaySocket.setTimeout(0);

      // Pipe data bidirectionally (same as port forward)
      clientSocket.pipe(gatewaySocket, { end: false });
      gatewaySocket.pipe(clientSocket, { end: false });

      clientSocket.on('error', () => {
        gatewaySocket.destroy();
      });

      gatewaySocket.on('error', () => {
        clientSocket.destroy();
      });

      clientSocket.on('close', () => {
        gatewaySocket.destroy();
      });

      gatewaySocket.on('close', () => {
        clientSocket.destroy();
      });
    } catch (err) {
      console.error('[RotatingProxy] Connection error:', err);
      clientSocket.destroy();
    }
  }

  private async performSocks5Handshake(socket: net.Socket): Promise<boolean> {
    return new Promise((resolve) => {
      const buffer = Buffer.alloc(2);
      socket.once('data', (data) => {
        if (data.length < 2 || data[0] !== 0x05) {
          resolve(false);
          return;
        }

        // Send method selection: no authentication
        socket.write(Buffer.from([0x05, 0x00]));
        resolve(true);
      });

      socket.once('error', () => resolve(false));
    });
  }

  private async readSocks5Request(socket: net.Socket): Promise<{ host: string; port: number } | null> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let totalLength = 0;
      let expectedLength = 4;

      const onData = (data: Buffer) => {
        chunks.push(data);
        totalLength += data.length;

        if (totalLength >= 4) {
          const cmd = chunks[0][1];
          const addrType = chunks[0][3];

          if (addrType === 0x01) {
            expectedLength = 10;
          } else if (addrType === 0x03) {
            if (totalLength >= 5) {
              const domainLength = chunks[0][4];
              expectedLength = 5 + domainLength + 2;
            }
          } else if (addrType === 0x04) {
            expectedLength = 22;
          }

          if (totalLength >= expectedLength) {
            socket.removeListener('data', onData);
            
            const fullBuffer = Buffer.concat(chunks, totalLength);
            let host: string;
            let port: number;

            if (addrType === 0x01) {
              host = `${fullBuffer[4]}.${fullBuffer[5]}.${fullBuffer[6]}.${fullBuffer[7]}`;
              port = (fullBuffer[8] << 8) | fullBuffer[9];
            } else if (addrType === 0x03) {
              const domainLength = fullBuffer[4];
              host = fullBuffer.slice(5, 5 + domainLength).toString('utf-8');
              port = (fullBuffer[5 + domainLength] << 8) | fullBuffer[5 + domainLength + 1];
            } else if (addrType === 0x04) {
              const ipv6Parts: string[] = [];
              for (let i = 0; i < 16; i += 2) {
                ipv6Parts.push(((fullBuffer[4 + i] << 8) | fullBuffer[4 + i + 1]).toString(16));
              }
              host = ipv6Parts.join(':');
              port = (fullBuffer[20] << 8) | fullBuffer[21];
            } else {
              resolve(null);
              return;
            }

            resolve({ host, port });
          }
        }
      };

      socket.on('data', onData);
      socket.once('error', () => {
        socket.removeListener('data', onData);
        resolve(null);
      });
    });
  }

  private buildSocks5Request(host: string, port: number): Buffer {
    const request: number[] = [0x05, 0x01, 0x00];

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = host.match(ipv4Regex);
    
    if (ipv4Match) {
      const parts = ipv4Match.slice(1, 5).map(Number);
      if (parts.every(p => p >= 0 && p <= 255)) {
        request.push(0x01);
        request.push(...parts);
      } else {
        request.push(0x03);
        request.push(host.length);
        request.push(...Buffer.from(host, 'utf-8'));
      }
    } else if (host.includes(':') && !host.includes('.')) {
      request.push(0x04);
      const parts = host.split(':');
      for (const part of parts) {
        const value = parseInt(part, 16);
        request.push((value >> 8) & 0xFF, value & 0xFF);
      }
    } else {
      request.push(0x03);
      request.push(host.length);
      request.push(...Buffer.from(host, 'utf-8'));
    }

    request.push((port >> 8) & 0xFF, port & 0xFF);

    return Buffer.from(request);
  }
}

export const rotatingProxyServerManager = new RotatingProxyServerManager();
