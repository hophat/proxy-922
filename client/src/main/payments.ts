import * as http from 'http';
import * as https from 'https';
import * as auth from './auth';

interface CreateUpstreamOrderDto {
  upstreamIds: string[];
  gatewayId?: string;
  duration: '24h' | '7d' | '30d';
  selectedPorts?: number[]; // Optional: Array of port numbers (3000-10000) mà user chọn
}

interface CreateRotatingProxyOrderDto {
  proxyCount: number;
  duration: '1d' | '3d' | '7d' | '15d';
}

interface RotatingProxyResponse {
  id: string;
  domain: string;
  ip: string;
  port: number | null;
  mappingId: string | null;
  rotationInterval: number | null;
  expiresAt: string;
  duration: string;
  status: string;
}

interface PaymentOrderResponse {
  id: string;
  orderCode: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qrCodeUrl: string | null;
  vaNumber: string | null;
  accountName: string | null;
  expiredAt: string;
  createdAt: string;
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

export async function createUpstreamPaymentOrder(
  backendURL: string,
  createDto: CreateUpstreamOrderDto,
): Promise<PaymentOrderResponse> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/payments/orders/upstream`, {
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
    console.error('[Payments] Failed to create payment order:', err);
    throw err;
  }
}

export async function getPaymentOrders(
  backendURL: string,
): Promise<PaymentOrderResponse[]> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/payments/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      return Array.isArray(data) ? data : [];
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
    console.error('[Payments] Failed to get payment orders:', err);
    throw err;
  }
}

export async function getPaymentOrderStatus(
  backendURL: string,
  orderCode: string,
): Promise<PaymentOrderResponse | null> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/payments/orders/${orderCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      return data || null;
    }

    if (response.statusCode === 404) {
      return null;
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
    console.error('[Payments] Failed to get payment order status:', err);
    throw err;
  }
}

export async function createRotatingProxyOrder(
  backendURL: string,
  createDto: CreateRotatingProxyOrderDto,
): Promise<PaymentOrderResponse> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/rotating-proxy/order`, {
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
    console.error('[Payments] Failed to create rotating proxy order:', err);
    throw err;
  }
}

export async function getMyRotatingProxies(
  backendURL: string,
): Promise<RotatingProxyResponse[]> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/rotating-proxy/my`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      return Array.isArray(data) ? data : [];
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
    console.error('[Payments] Failed to get rotating proxies:', err);
    throw err;
  }
}

export async function updateRotatingProxyRotationInterval(
  backendURL: string,
  id: string,
  rotationInterval: number,
): Promise<RotatingProxyResponse> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/rotating-proxy/${id}/rotation-interval`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rotationInterval }),
    });

    if (response.statusCode === 200) {
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
    console.error('[Payments] Failed to update rotating proxy rotation interval:', err);
    throw err;
  }
}

export async function updateRotatingProxyPort(
  backendURL: string,
  id: string,
  port: number,
): Promise<RotatingProxyResponse> {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/rotating-proxy/${id}/port`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ port }),
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
    console.error('[Payments] Failed to update rotating proxy port:', err);
    throw err;
  }
}
