import * as http from 'http';
import * as https from 'https';

/**
 * Get local IP address from network interfaces
 * Returns first non-internal IPv4 address, or 127.0.0.1 if none found
 */
export function getLocalIP(): string {
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    // Get all non-internal IPv4 addresses
    const localIPs: string[] = [];
    Object.keys(interfaces).forEach((name) => {
      const nets = interfaces[name];
      if (nets) {
        nets.forEach((net: any) => {
          // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
          if (net.family === 'IPv4' && !net.internal) {
            localIPs.push(net.address);
          }
        });
      }
    });

    // Return first IP from network interface, or 127.0.0.1 as fallback
    if (localIPs.length > 0) {
      console.log(`[LocalIP] Using network interface IP: ${localIPs[0]}`);
      return localIPs[0];
    }

    console.warn('[LocalIP] No network interface IP found, using 127.0.0.1');
    return '127.0.0.1';
  } catch (err) {
    console.error('[LocalIP] Failed to get IP from network interfaces:', err);
    return '127.0.0.1';
  }
}

/**
 * Get public IP address of the machine
 * Tries multiple services for reliability
 */
export async function getPublicIP(): Promise<string> {
  const services = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ifconfig.me/ip',
    'https://icanhazip.com',
  ];

  for (const service of services) {
    try {
      const ip = await fetchIP(service);
      if (ip && isValidIP(ip)) {
        console.log(`[PublicIP] Got IP from ${service}: ${ip}`);
        return ip;
      }
    } catch (err) {
      console.warn(`[PublicIP] Failed to get IP from ${service}:`, err);
      continue;
    }
  }

  // Fallback: use local IP
  console.log('[PublicIP] Falling back to local IP');
  return getLocalIP();
}

async function fetchIP(service: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const url = new URL(service);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(service, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (service.includes('ipify')) {
            const json = JSON.parse(data);
            resolve(json.ip || null);
          } else {
            // Plain text response
            resolve(data.trim() || null);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;
  
  return match.slice(1, 5).every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  
  return false;
}
