import Store from 'electron-store';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

interface AuthStore {
  token?: string;
  email?: string;
}

const store = new Store<AuthStore>({
  name: 'auth',
  encryptionKey: 'proxy992-secret-key-change-in-production',
});

// Helper function to make HTTP requests
function httpRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
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
        timeout: 5000, // 5 second timeout (reduced for faster response)
      };

      console.log(`[HTTP] Making ${options.method || 'GET'} request to ${url}`);
      console.log(`[HTTP] Hostname: ${urlObj.hostname}, Port: ${requestOptions.port}`);

      const req = client.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`[HTTP] Response received: ${res.statusCode}`);
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (err) => {
        console.error(`[HTTP] Request error:`, err);
        reject(err);
      });

      req.on('timeout', () => {
        console.error(`[HTTP] Request timeout for ${url}`);
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    } catch (err: any) {
      console.error(`[HTTP] Failed to create request:`, err);
      reject(err);
    }
  });
}

export function saveToken(token: string, email: string): void {
  store.set('token', token);
  store.set('email', email);
}

export function getToken(): string | undefined {
  return store.get('token');
}

export function getEmail(): string | undefined {
  return store.get('email');
}

export function clearAuth(): void {
  store.delete('token');
  store.delete('email');
}

export function isAuthenticated(): boolean {
  return !!store.get('token');
}

export async function register(email: string, password: string, backendURL: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`[Auth] Attempting register to ${backendURL}/auth/register`);
    const response = await httpRequest(`${backendURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = `HTTP ${response.statusCode}`;
      try {
        const error = JSON.parse(response.body);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        // Response is not JSON, use body text
        if (response.body) {
          errorMessage = response.body;
        }
      }
      console.error(`[Auth] Register failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(response.body);
    console.log('[Auth] Register successful');
    return {
      success: true,
    };
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    const errorMessage = err.message || 'Không thể kết nối đến server. Vui lòng kiểm tra backend đã chạy chưa.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function login(email: string, password: string, backendURL: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
  quotaUsed?: number;
  quotaTotal?: number;
}> {
  try {
    console.log(`[Auth] Attempting login to ${backendURL}/auth/login`);
    const response = await httpRequest(`${backendURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = `HTTP ${response.statusCode}`;
      try {
        const error = JSON.parse(response.body);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        // Response is not JSON, use body text
        if (response.body) {
          errorMessage = response.body;
        }
      }
      console.error(`[Auth] Login failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(response.body);
    if (!data.token) {
      console.error('[Auth] Login response missing token');
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    saveToken(data.token, email);
    console.log('[Auth] Login successful');

    return {
      success: true,
      token: data.token,
      quotaUsed: data.user?.quotaUsed || 0,
      quotaTotal: data.user?.quotaTotal || 0,
    };
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    const errorMessage = err.message || 'Không thể kết nối đến server. Vui lòng kiểm tra backend đã chạy chưa.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function checkToken(backendURL: string): Promise<boolean> {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const response = await httpRequest(`${backendURL}/auth/check-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      console.log('[Auth] Token check failed, clearing auth');
      clearAuth();
      return false;
    }

    const data = JSON.parse(response.body);
    return data.valid === true;
  } catch (err) {
    console.error('[Auth] Token check error:', err);
    return false;
  }
}

export async function getProfile(backendURL: string): Promise<{ userId: string; email: string }> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/auth/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error('Failed to get profile');
    }

    const data = JSON.parse(response.body);
    return {
      userId: data.userId,
      email: data.email,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to get profile');
  }
}

export async function getQuota(backendURL: string): Promise<{ used: number; total: number }> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    // First get user info from token
    const checkResponse = await httpRequest(`${backendURL}/auth/check-token`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (checkResponse.statusCode < 200 || checkResponse.statusCode >= 300) {
      throw new Error('Invalid token');
    }

    const checkData = JSON.parse(checkResponse.body);
    const userId = checkData.userId;

    if (!userId) {
      throw new Error('User ID not found');
    }

    const quotaResponse = await httpRequest(`${backendURL}/usage/users/${userId}/quota`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (quotaResponse.statusCode < 200 || quotaResponse.statusCode >= 300) {
      throw new Error('Failed to get quota');
    }

    const quotaData = JSON.parse(quotaResponse.body);
    return {
      used: quotaData.used || 0,
      total: quotaData.total || 0,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to get quota');
  }
}

export async function getActiveProxiesCount(backendURL: string): Promise<number> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/proxies/active`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error('Failed to get active proxies');
    }

    const data = JSON.parse(response.body);
    // data should be an array of proxies
    return Array.isArray(data) ? data.length : 0;
  } catch (err: any) {
    console.error('[Auth] Failed to get active proxies:', err);
    return 0;
  }
}

