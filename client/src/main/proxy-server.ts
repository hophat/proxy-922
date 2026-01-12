import * as net from 'net';
import { createConnection, createConnectionWithMapping } from './connection';
import { PortMapping } from './port-forward';

const SOCKS5_PORT = 1080;
const SOCKS5_HOST = '127.0.0.1';

let server: net.Server | null = null;
let isRunning = false;

export function startSocks5Server(token: string, gatewayHost: string, gatewayPort: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      resolve();
      return;
    }

    server = net.createServer((clientSocket) => {
      handleSocks5Connection(clientSocket, token, gatewayHost, gatewayPort);
    });

    server.listen(SOCKS5_PORT, SOCKS5_HOST, () => {
      isRunning = true;
      console.log(`SOCKS5 server listening on ${SOCKS5_HOST}:${SOCKS5_PORT}`);
      resolve();
    });

    server.on('error', (err) => {
      console.error('SOCKS5 server error:', err);
      reject(err);
    });
  });
}

export function stopSocks5Server(): Promise<void> {
  return new Promise((resolve) => {
    if (!server || !isRunning) {
      resolve();
      return;
    }

    server.close(() => {
      isRunning = false;
      server = null;
      console.log('SOCKS5 server stopped');
      resolve();
    });
  });
}

export function isServerRunning(): boolean {
  return isRunning;
}

async function handleSocks5Connection(
  clientSocket: net.Socket,
  token: string,
  gatewayHost: string,
  gatewayPort: number,
) {
  try {
    console.log('[Proxy] New SOCKS5 connection');
    
    // SOCKS5 handshake
    const handshake = await performSocks5Handshake(clientSocket);
    if (!handshake) {
      console.error('[Proxy] SOCKS5 handshake failed');
      clientSocket.destroy();
      return;
    }
    console.log('[Proxy] SOCKS5 handshake successful');

    // Read SOCKS5 request and parse target address
    const targetInfo = await readSocks5Request(clientSocket);
    if (!targetInfo) {
      console.error('[Proxy] Failed to read SOCKS5 request');
      clientSocket.destroy();
      return;
    }
    console.log(`[Proxy] SOCKS5 request: ${targetInfo.host}:${targetInfo.port}`);

    // Connect to gateway
    console.log(`[Proxy] Connecting to gateway ${gatewayHost}:${gatewayPort}`);
    const gatewaySocket = await createConnection(token, gatewayHost, gatewayPort);
    if (!gatewaySocket) {
      console.error('[Proxy] Failed to connect to gateway');
      // Send error response
      clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
      clientSocket.destroy();
      return;
    }
    console.log('[Proxy] Connected to gateway');

    // Gateway expects SOCKS5 request format after token
    // Send SOCKS5 CONNECT request with target info
    const socks5Request = buildSocks5Request(targetInfo.host, targetInfo.port);
    console.log(`[Proxy] Sending SOCKS5 request to gateway: ${targetInfo.host}:${targetInfo.port}`);
    console.log(`[Proxy] SOCKS5 request hex: ${socks5Request.toString('hex')}`);
    
    // Write SOCKS5 request to gateway immediately after connection
    // Note: Gateway reads token first, then reads SOCKS5 request from buffered connection
    // Make sure to send SOCKS5 request completely
    console.log(`[Proxy] SOCKS5 request length: ${socks5Request.length} bytes, hex: ${socks5Request.toString('hex')}`);
    
    // Ensure TCP_NODELAY is set to send immediately
    gatewaySocket.setNoDelay(true);
    
    // Write all data at once
    // socket.write() returns false if buffer is full and data is queued
    const allDataWritten = gatewaySocket.write(socks5Request);
    console.log(`[Proxy] SOCKS5 request queued: ${allDataWritten ? 'immediately' : 'buffered'} (${socks5Request.length} bytes)`);
    
    if (!allDataWritten) {
      // Wait for drain if buffer is full
      // Node.js will automatically send the queued data when socket is ready
      console.log(`[Proxy] Waiting for drain event (buffer full)`);
      await new Promise(resolve => {
        gatewaySocket.once('drain', resolve);
      });
      console.log(`[Proxy] Drain event received, data sent`);
    }
    
    // Force flush (TCP_NODELAY should handle this, but ensure it's sent)
    // Note: Node.js doesn't have explicit flush, but setNoDelay helps

    // Small delay to ensure TCP has sent all data (reduced for faster response)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Read gateway response (should be SOCKS5 success response or error)
    // Gateway sends SOCKS5 response after processing the request
    const responseBuffer = Buffer.alloc(256);
    try {
      gatewaySocket.setTimeout(5000); // Reduced to 5s for faster timeout
      const responseData = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalLength = 0;
        
        const onData = (data: Buffer) => {
          chunks.push(data);
          totalLength += data.length;
          
          // Check if we have enough data or if it's an error message
          const combined = Buffer.concat(chunks);
          const responseStr = combined.toString('utf-8', 0, Math.min(combined.length, 50));
          
          // If it's an error message, we have enough
          if (responseStr.startsWith('ERROR:')) {
            gatewaySocket.removeListener('data', onData);
            resolve(combined);
            return;
          }
          
          // If it's SOCKS5 response (starts with 0x05), we need at least 10 bytes
          if (combined[0] === 0x05 && totalLength >= 10) {
            gatewaySocket.removeListener('data', onData);
            resolve(combined);
            return;
          }
          
          // If we have more than 256 bytes, something is wrong
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

      console.log(`[Proxy] Received gateway response: ${responseData.length} bytes`);
      console.log(`[Proxy] Response hex: ${responseData.slice(0, 20).toString('hex')}`);

      // Check if response is error message (starts with "ERROR:")
      const responseStr = responseData.toString('utf-8', 0, Math.min(responseData.length, 50));
      if (responseStr.startsWith('ERROR:')) {
        console.error('[Proxy] Gateway error:', responseStr.trim());
        clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
        clientSocket.destroy();
        gatewaySocket.destroy();
        return;
      }

      // If response is SOCKS5 format (starts with 0x05), forward it to client
      if (responseData[0] === 0x05) {
        // Forward the first 10 bytes (SOCKS5 response)
        const socks5Response = responseData.slice(0, 10);
        console.log(`[Proxy] Forwarding SOCKS5 response to client: ${socks5Response.toString('hex')}`);
        clientSocket.write(socks5Response);
        
        // If there's more data, it should be piped (but gateway shouldn't send more at this point)
        if (responseData.length > 10) {
          console.warn(`[Proxy] Gateway sent extra data after SOCKS5 response: ${responseData.length - 10} bytes`);
        }
      } else {
        console.warn('[Proxy] Gateway response is not SOCKS5 format, sending default success');
        // Gateway sent something unexpected, send SOCKS5 success to client
        clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
      }
    } catch (err) {
      console.error('[Proxy] Error reading gateway response:', err);
      // Assume success and send SOCKS5 success response
      clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    }

    // Remove timeout
    gatewaySocket.setTimeout(0);

    // Pipe data bidirectionally (raw TCP data, not SOCKS5 format)
    // Note: SOCKS5 handshake and request have already been processed
    clientSocket.pipe(gatewaySocket, { end: false });
    gatewaySocket.pipe(clientSocket, { end: false });

    // Handle errors
    clientSocket.on('error', () => {
      gatewaySocket.destroy();
    });

    gatewaySocket.on('error', () => {
      clientSocket.destroy();
    });

    // Clean up when either side closes
    clientSocket.on('close', () => {
      gatewaySocket.destroy();
    });

    gatewaySocket.on('close', () => {
      clientSocket.destroy();
    });
  } catch (err) {
    console.error('SOCKS5 connection error:', err);
    clientSocket.destroy();
  }
}

async function performSocks5Handshake(socket: net.Socket): Promise<boolean> {
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

interface TargetInfo {
  host: string;
  port: number;
}

async function readSocks5Request(socket: net.Socket): Promise<TargetInfo | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;
    let expectedLength = 4; // Minimum request length

    const onData = (data: Buffer) => {
      chunks.push(data);
      totalLength += data.length;

      if (totalLength >= 4) {
        const cmd = chunks[0][1];
        const addrType = chunks[0][3];

        if (addrType === 0x01) {
          // IPv4: 4 bytes address + 2 bytes port = 10 total
          expectedLength = 10;
        } else if (addrType === 0x03) {
          // Domain name: 1 byte length + domain + 2 bytes port
          if (totalLength >= 5) {
            const domainLength = chunks[0][4];
            expectedLength = 5 + domainLength + 2;
          }
        } else if (addrType === 0x04) {
          // IPv6: 16 bytes address + 2 bytes port = 22 total
          expectedLength = 22;
        }

        if (totalLength >= expectedLength) {
          socket.removeListener('data', onData);
          
          // Parse target address
          const fullBuffer = Buffer.concat(chunks, totalLength);
          let host: string;
          let port: number;

          if (addrType === 0x01) {
            // IPv4
            host = `${fullBuffer[4]}.${fullBuffer[5]}.${fullBuffer[6]}.${fullBuffer[7]}`;
            port = (fullBuffer[8] << 8) | fullBuffer[9];
          } else if (addrType === 0x03) {
            // Domain name
            const domainLength = fullBuffer[4];
            host = fullBuffer.slice(5, 5 + domainLength).toString('utf-8');
            port = (fullBuffer[5 + domainLength] << 8) | fullBuffer[5 + domainLength + 1];
          } else if (addrType === 0x04) {
            // IPv6
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

function buildSocks5Request(host: string, port: number): Buffer {
  // Build SOCKS5 CONNECT request
  const request: number[] = [0x05, 0x01, 0x00]; // SOCKS5, CONNECT, Reserved

  // Determine address type
  // Check if it's a valid IPv4 address (4 numbers separated by dots)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = host.match(ipv4Regex);
  
  if (ipv4Match) {
    // Valid IPv4 address
    const parts = ipv4Match.slice(1, 5).map(Number);
    // Validate each part is 0-255
    if (parts.every(p => p >= 0 && p <= 255)) {
      request.push(0x01); // IPv4 type
      request.push(...parts); // IP address bytes
    } else {
      // Invalid IPv4, treat as domain name
      request.push(0x03); // Domain type
      request.push(host.length); // Domain length
      request.push(...Buffer.from(host, 'utf-8')); // Domain bytes
    }
  } else if (host.includes(':') && !host.includes('.')) {
    // IPv6 (contains : but not .)
    request.push(0x04); // IPv6 type
    const parts = host.split(':');
    for (const part of parts) {
      const value = parseInt(part, 16);
      request.push((value >> 8) & 0xFF, value & 0xFF);
    }
  } else {
    // Domain name (default)
    request.push(0x03); // Domain type
    request.push(host.length); // Domain length
    request.push(...Buffer.from(host, 'utf-8')); // Domain bytes
  }

  // Port (2 bytes, big-endian)
  request.push((port >> 8) & 0xFF, port & 0xFF);

  const buffer = Buffer.from(request);
  console.log(`[Proxy] Built SOCKS5 request: ${buffer.length} bytes, hex: ${buffer.toString('hex')}`);
  return buffer;
}

export async function startPortForwardServer(
  mapping: PortMapping,
  token: string,
  gatewayHost: string,
  gatewayPort: number,
): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((clientSocket) => {
      handlePortForwardConnection(clientSocket, mapping, token, gatewayHost, gatewayPort);
    });

    server.listen(mapping.localPort, '127.0.0.1', () => {
      console.log(`[PortForward] SOCKS5 server listening on 127.0.0.1:${mapping.localPort} for mapping ${mapping.mappingId}`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error(`[PortForward] SOCKS5 server error on port ${mapping.localPort}:`, err);
      reject(err);
    });
  });
}

async function handlePortForwardConnection(
  clientSocket: net.Socket,
  mapping: PortMapping,
  token: string,
  gatewayHost: string,
  gatewayPort: number,
) {
  try {
    console.log(`[PortForward] New SOCKS5 connection on port ${mapping.localPort} for mapping ${mapping.mappingId}`);
    
    // SOCKS5 handshake
    const handshake = await performSocks5Handshake(clientSocket);
    if (!handshake) {
      console.error('[PortForward] SOCKS5 handshake failed');
      clientSocket.destroy();
      return;
    }
    console.log('[PortForward] SOCKS5 handshake successful');

    // Read SOCKS5 request and parse target address
    const targetInfo = await readSocks5Request(clientSocket);
    if (!targetInfo) {
      console.error('[PortForward] Failed to read SOCKS5 request');
      clientSocket.destroy();
      return;
    }
    console.log(`[PortForward] SOCKS5 request: ${targetInfo.host}:${targetInfo.port}`);

    // Connect to gateway with mappingId
    console.log(`[PortForward] Connecting to gateway ${gatewayHost}:${gatewayPort} with mappingId ${mapping.mappingId}`);
    const gatewaySocket = await createConnectionWithMapping(token, mapping.mappingId, gatewayHost, gatewayPort);
    if (!gatewaySocket) {
      console.error('[PortForward] Failed to connect to gateway');
      clientSocket.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
      clientSocket.destroy();
      return;
    }
    console.log('[PortForward] Connected to gateway');

    // Send SOCKS5 CONNECT request
    const socks5Request = buildSocks5Request(targetInfo.host, targetInfo.port);
    console.log(`[PortForward] Sending SOCKS5 request to gateway: ${targetInfo.host}:${targetInfo.port}`);
    
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
        console.error('[PortForward] Gateway error:', responseStr.trim());
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
      console.error('[PortForward] Error reading gateway response:', err);
      clientSocket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    }

    gatewaySocket.setTimeout(0);

    // Pipe data bidirectionally
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
    console.error('[PortForward] Connection error:', err);
    clientSocket.destroy();
  }
}

