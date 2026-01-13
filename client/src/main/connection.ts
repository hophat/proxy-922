import * as tls from 'tls';
import * as net from 'net';

export function createConnection(
  token: string,
  gatewayHost: string,
  gatewayPort: number,
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    // Create TLS connection to gateway
    // Only disable certificate validation in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const socket = tls.connect(
      {
        host: gatewayHost,
        port: gatewayPort,
        rejectUnauthorized: !isDevelopment, // Only allow self-signed certs in development
        minVersion: 'TLSv1.2', // Match gateway's TLS 1.2 requirement
        maxVersion: 'TLSv1.3', // Support TLS 1.3 if available
      },
      () => {
        // Send token first
        const tokenMessage = `TOKEN:${token}\n`;
        socket.write(tokenMessage);
        // Note: SOCKS5 request will be sent separately by proxy-server.ts
        // This ensures token is sent first, then SOCKS5 request follows

        resolve(socket);
      },
    );

    socket.on('error', (err) => {
      console.error('[Connection] TLS connection error:', err);
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    // Set connection timeout (reduced for faster response)
    socket.setTimeout(5000); // 5 seconds
  });
}

export function createConnectionWithMapping(
  token: string,
  mappingId: string,
  gatewayHost: string,
  gatewayPort: number,
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    // Create TLS connection to gateway
    // Only disable certificate validation in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const socket = tls.connect(
      {
        host: gatewayHost,
        port: gatewayPort,
        rejectUnauthorized: !isDevelopment, // Only allow self-signed certs in development
        minVersion: 'TLSv1.2', // Match gateway's TLS 1.2 requirement
        maxVersion: 'TLSv1.3', // Support TLS 1.3 if available
      },
      () => {
        // Send token and MAPPING header
        const tokenMessage = `TOKEN:${token}\nMAPPING:${mappingId}\n`;
        socket.write(tokenMessage);
        // Note: SOCKS5 request will be sent separately by proxy-server.ts

        resolve(socket);
      },
    );

    socket.on('error', (err) => {
      console.error('[Connection] TLS connection error:', err);
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    // Set connection timeout
    socket.setTimeout(5000); // 5 seconds
  });
}

