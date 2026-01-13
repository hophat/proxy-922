import Store from 'electron-store';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import * as path from 'path';
import * as fs from 'fs';

interface AuthStore {
  token?: string;
  email?: string;
}

// Generate encryption key from machine-specific data for better security
// In production, this should be stored securely or generated per-user
function getEncryptionKey(): string {
  const os = require('os');
  const crypto = require('crypto');
  
  // Use machine-specific data to generate a key
  // In production, consider using a more secure method or environment variable
  const machineId = os.hostname() + os.platform() + os.arch();
  const key = crypto.createHash('sha256').update(machineId + 'Proxy96-secure-key').digest('hex');
  
  // For production, use environment variable if available
  return process.env.ENCRYPTION_KEY || key;
}

// Function to safely initialize store with corruption recovery
function createStore(): Store<AuthStore> {
  try {
    return new Store<AuthStore>({
      name: 'auth',
      encryptionKey: getEncryptionKey(),
      clearInvalidConfig: true, // Automatically clear invalid config
    });
  } catch (error: any) {
    console.error('[Auth] Failed to create store, attempting to recover...', error);
    
    // Try to delete corrupt config file and recreate
    try {
      // Use electron-store's default path or try to get from app if available
      const electron = require('electron');
      const app = electron.app || electron.remote?.app;
      
      let configPath: string | null = null;
      
      if (app && app.getPath) {
        try {
          const userDataPath = app.getPath('userData');
          configPath = path.join(userDataPath, 'auth.json');
        } catch (pathError) {
          console.warn('[Auth] Could not get userData path, trying default location');
        }
      }
      
      // Fallback: try common electron-store locations
      if (!configPath) {
        const os = require('os');
        const platform = os.platform();
        let basePath: string;
        
        if (platform === 'darwin') {
          basePath = path.join(os.homedir(), 'Library', 'Application Support', 'Proxy96-client');
        } else if (platform === 'win32') {
          basePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Proxy96-client');
        } else {
          basePath = path.join(os.homedir(), '.config', 'Proxy96-client');
        }
        
        configPath = path.join(basePath, 'auth.json');
      }
      
      if (configPath && fs.existsSync(configPath)) {
        console.log('[Auth] Deleting corrupt config file:', configPath);
        fs.unlinkSync(configPath);
      }
      
      // Try again with a fresh store
      return new Store<AuthStore>({
        name: 'auth',
        encryptionKey: getEncryptionKey(),
        clearInvalidConfig: true,
      });
    } catch (recoveryError: any) {
      console.error('[Auth] Failed to recover store:', recoveryError);
      // Return a new store anyway - it will create empty config
      return new Store<AuthStore>({
        name: 'auth',
        encryptionKey: getEncryptionKey(),
        clearInvalidConfig: true,
      });
    }
  }
}

const store = createStore();

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
  message?: string;
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
    console.log('[Auth] Register successful, OTP sent');
    return {
      success: true,
      message: data.message || 'OTP đã được gửi đến email của bạn',
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

export async function verifyOtp(email: string, code: string, password: string, backendURL: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    console.log(`[Auth] Attempting verify OTP to ${backendURL}/auth/verify-otp`);
    const response = await httpRequest(`${backendURL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, password }),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = `HTTP ${response.statusCode}`;
      try {
        const error = JSON.parse(response.body);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        if (response.body) {
          errorMessage = response.body;
        }
      }
      console.error(`[Auth] Verify OTP failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(response.body);
    console.log('[Auth] Verify OTP successful');
    return {
      success: true,
      message: data.message || 'Đăng ký thành công!',
    };
  } catch (err: any) {
    console.error('[Auth] Verify OTP error:', err);
    const errorMessage = err.message || 'Không thể kết nối đến server. Vui lòng kiểm tra backend đã chạy chưa.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function resendOtp(email: string, backendURL: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    console.log(`[Auth] Attempting resend OTP to ${backendURL}/auth/resend-otp`);
    const response = await httpRequest(`${backendURL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = `HTTP ${response.statusCode}`;
      try {
        const error = JSON.parse(response.body);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        if (response.body) {
          errorMessage = response.body;
        }
      }
      console.error(`[Auth] Resend OTP failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(response.body);
    console.log('[Auth] Resend OTP successful');
    return {
      success: true,
      message: data.message || 'OTP đã được gửi lại',
    };
  } catch (err: any) {
    console.error('[Auth] Resend OTP error:', err);
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

export async function changePassword(
  backendURL: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await httpRequest(`${backendURL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errorMessage = `HTTP ${response.statusCode}`;
      try {
        const error = JSON.parse(response.body);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {
        if (response.body) {
          errorMessage = response.body;
        }
      }
      console.error(`[Auth] Change password failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = JSON.parse(response.body);
    console.log('[Auth] Change password successful');
    return {
      success: true,
      message: data.message || 'Đổi mật khẩu thành công',
    };
  } catch (err: any) {
    console.error('[Auth] Change password error:', err);
    const errorMessage = err.message || 'Không thể kết nối đến server';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

