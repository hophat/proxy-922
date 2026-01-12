import * as http from 'http';
import * as https from 'https';
import * as auth from './auth';

interface PublicUpstream {
  id: string;
  host: string; // IP đã được mask (ví dụ: 192.168.***.***)
  port: number;
  country?: string;
  state?: string;
  city?: string;
  ping?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUpstreamPurchaseDto {
  upstreamIds: string[];
  gatewayId: string;
  duration: '24h' | '7d' | '30d';
}

interface PurchaseResponse {
  purchaseId: string;
  gateway: {
    id: string;
    ip: string;
    portRangeStart: number;
    portRangeEnd: number;
  };
  ports: Array<{
    id: string;
    port: number;
    mappingId: string;
  }>;
  credentials: {
    username: string;
    password: string;
  };
  expiresAt: string;
  duration: string;
}

function httpRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000,
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function getAvailableUpstreams(backendURL: string): Promise<PublicUpstream[]> {
  try {
    const response = await httpRequest(`${backendURL}/socks5-upstream/public/available`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.statusCode === 200) {
      return JSON.parse(response.body);
    }

    throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
  } catch (err: any) {
    console.error('[Upstreams] Failed to get available upstreams:', err);
    throw err;
  }
}

export async function createUpstreamPurchase(
  backendURL: string,
  createDto: CreateUpstreamPurchaseDto,
): Promise<PurchaseResponse> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/purchases/upstream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(createDto),
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return JSON.parse(response.body);
    }

    let errorMessage = `HTTP ${response.statusCode}`;
    try {
      const error = JSON.parse(response.body);
      errorMessage = error.message || error.error || errorMessage;
    } catch (e) {
      if (response.body) {
        errorMessage = response.body;
      }
    }

    throw new Error(errorMessage);
  } catch (err: any) {
    console.error('[Upstreams] Failed to create upstream purchase:', err);
    throw err;
  }
}
