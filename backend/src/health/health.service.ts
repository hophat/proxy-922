import { Injectable } from '@nestjs/common';
import { ProxiesService } from '../proxies/proxies.service';
import * as net from 'net';

@Injectable()
export class HealthService {
  constructor(private proxiesService: ProxiesService) {}

  async checkProxy(proxyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const proxy = await this.proxiesService.findById(proxyId);
      const credentials = await this.proxiesService.getProxyCredentials(proxy);

      const isAlive = await this.testSocks5Proxy(
        credentials.host,
        credentials.port,
        credentials.username,
        credentials.password,
      );

      const lastCheck = new Date();
      await this.proxiesService.updateHealthStatus(proxyId, isAlive, lastCheck);

      return {
        success: true,
        message: isAlive ? 'Proxy is alive' : 'Proxy is dead',
      };
    } catch (error) {
      return {
        success: false,
        message: `Health check failed: ${error.message}`,
      };
    }
  }

  async checkAllProxies(): Promise<{ checked: number; alive: number; dead: number }> {
    const proxies = await this.proxiesService.findAll();
    let alive = 0;
    let dead = 0;

    const promises = proxies.map(async (proxy) => {
      try {
        const credentials = await this.proxiesService.getProxyCredentials(proxy);
        const isAlive = await this.testSocks5Proxy(
          credentials.host,
          credentials.port,
          credentials.username,
          credentials.password,
        );

        const lastCheck = new Date();
        await this.proxiesService.updateHealthStatus(proxy.id, isAlive, lastCheck);

        if (isAlive) {
          alive++;
        } else {
          dead++;
        }
      } catch (error) {
        dead++;
      }
    });

    await Promise.all(promises);

    return {
      checked: proxies.length,
      alive,
      dead,
    };
  }

  private async testSocks5Proxy(
    host: string,
    port: number,
    username?: string,
    password?: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const proxyAddr = `${host}:${port}`;
      const timeout = 5000; // 5 seconds timeout

      const socket = new net.Socket();
      let handshakeComplete = false;

      const cleanup = () => {
        if (!socket.destroyed) {
          socket.destroy();
        }
      };

      socket.setTimeout(timeout);
      socket.on('timeout', () => {
        cleanup();
        resolve(false);
      });

      socket.on('error', () => {
        cleanup();
        resolve(false);
      });

      socket.connect(port, host, () => {
        // SOCKS5 Greeting - offer both no-auth and username/password if credentials available
        if (username && password) {
          // Offer both no-auth (0x00) and username/password (0x02)
          socket.write(Buffer.from([0x05, 0x02, 0x00, 0x02]));
        } else {
          // Offer no-auth only
          socket.write(Buffer.from([0x05, 0x01, 0x00]));
        }
      });

      socket.on('data', (data: Buffer) => {
        if (!handshakeComplete && data.length >= 2) {
          if (data[0] !== 0x05) {
            cleanup();
            resolve(false);
            return;
          }

          const authMethod = data[1];

          if (authMethod === 0x00) {
            // No auth - proceed to CONNECT
            handshakeComplete = true;
            this.sendConnectRequest(socket, resolve, cleanup);
          } else if (authMethod === 0x02 && username && password) {
            // Username/password auth required
            const authBuffer = Buffer.allocUnsafe(3 + username.length + password.length);
            authBuffer[0] = 0x01; // Auth version
            authBuffer[1] = username.length;
            authBuffer.write(username, 2);
            authBuffer[2 + username.length] = password.length;
            authBuffer.write(password, 3 + username.length);
            socket.write(authBuffer);
          } else {
            cleanup();
            resolve(false);
            return;
          }
        } else if (!handshakeComplete && data.length >= 2 && data[0] === 0x01) {
          // Auth response
          if (data[1] === 0x00) {
            handshakeComplete = true;
            this.sendConnectRequest(socket, resolve, cleanup);
          } else {
            cleanup();
            resolve(false);
          }
        } else if (handshakeComplete && data.length >= 2) {
          // CONNECT response
          if (data[1] === 0x00) {
            cleanup();
            resolve(true);
          } else {
            cleanup();
            resolve(false);
          }
        }
      });
    });
  }

  private sendConnectRequest(
    socket: net.Socket,
    resolve: (value: boolean) => void,
    cleanup: () => void,
  ) {
    // Test connection to httpbin.org:80
    const testHost = 'httpbin.org';
    const testPort = 80;

    const request = Buffer.allocUnsafe(7 + testHost.length);
    request[0] = 0x05; // SOCKS5
    request[1] = 0x01; // CONNECT
    request[2] = 0x00; // Reserved
    request[3] = 0x03; // Domain name
    request[4] = testHost.length;
    request.write(testHost, 5);
    request.writeUInt16BE(testPort, 5 + testHost.length);

    socket.write(request);
  }
}

