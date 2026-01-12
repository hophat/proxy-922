import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as auth from './auth';
import { getPortForwardManager, PortMapping } from './port-forward';
import * as upstreams from './upstreams';
import * as payments from './payments';

let mainWindow: BrowserWindow | null = null;
const BACKEND_URL = process.env.BACKEND_URL || 'https://api-proxy.gulagi.com';
// const BACKEND_URL = process.env.BACKEND_URL_DEV || 'http://localhost:3300';
const GATEWAY_HOST = process.env.GATEWAY_HOST || '14.225.254.130';
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '8880', 10);

function createWindow() {
  const fs = require('fs');
  const preloadPath = path.join(__dirname, 'preload.js');
  const absolutePreloadPath = path.resolve(preloadPath);
  
  console.log(`[Main] Preload path: ${preloadPath}`);
  console.log(`[Main] Absolute preload path: ${absolutePreloadPath}`);
  console.log(`[Main] Preload exists:`, fs.existsSync(absolutePreloadPath));

  if (!fs.existsSync(absolutePreloadPath)) {
    console.error(`[Main] ERROR: Preload script not found at ${absolutePreloadPath}`);
  }

  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: absolutePreloadPath, // Use absolute path
      webSecurity: false, // Disable for development
      sandbox: false, // Disable sandbox to ensure preload works
    },
  });

  // Listen for preload errors
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[Main] Preload script error:', preloadPath);
    console.error('[Main] Error details:', error);
  });

  // Listen for when preload is loaded
  mainWindow.webContents.on('did-frame-finish-load', (event, isMainFrame) => {
    if (isMainFrame) {
      console.log('[Main] Main frame finished loading, preload should be executed');
    }
  });

  // Listen for when the page is loaded
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] Page finished loading');
    // Wait a bit for preload to finish
    setTimeout(() => {
      // Check if electronAPI is available in renderer
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          (function() {
            console.log('[Main Check] electronAPI available:', typeof window.electronAPI !== 'undefined');
            console.log('[Main Check] __PRELOAD_READY__:', typeof window.__PRELOAD_READY__ !== 'undefined');
            console.log('[Main Check] __PRELOAD_ERROR__:', window.__PRELOAD_ERROR__);
            return typeof window.electronAPI !== 'undefined';
          })();
        `).then((available) => {
          console.log(`[Main] electronAPI available in renderer: ${available}`);
          if (!available) {
            console.error('[Main] WARNING: electronAPI is NOT available in renderer!');
            console.error('[Main] This means preload script may not have loaded correctly.');
            console.error('[Main] Preload path was:', absolutePreloadPath);
            console.error('[Main] Attempting to inject electronAPI directly...');
            
            // Try to inject IPC handler directly as fallback
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                window.electronAPI = {
                  login: (email, password) => {
                    console.log('[Injected] login called');
                    return window.electron?.ipcRenderer?.invoke('login', email, password);
                  },
                  checkAuth: () => {
                    console.log('[Injected] checkAuth called');
                    return window.electron?.ipcRenderer?.invoke('checkAuth');
                  },
                  getQuota: () => {
                    console.log('[Injected] getQuota called');
                    return window.electron?.ipcRenderer?.invoke('getQuota');
                  },
                  disconnect: () => {
                    console.log('[Injected] disconnect called');
                    return window.electron?.ipcRenderer?.invoke('disconnect');
                  },
                  connect: () => {
                    console.log('[Injected] connect called');
                    return window.electron?.ipcRenderer?.invoke('connect');
                  }
                };
                console.log('[Main] electronAPI injected directly');
              `).catch((err) => {
                console.error('[Main] Failed to inject electronAPI:', err);
              });
            }
          }
        }).catch((err) => {
          console.error('[Main] Error checking electronAPI:', err);
        });
      }
    }, 500);
  });

  // Forward console logs from renderer to main process
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Main] Development mode - Loading URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log(`[Main] Production mode - Loading file: ${htmlPath}`);
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('🚀 Electron app starting...');
  console.log(`📡 Backend URL: ${BACKEND_URL}`);
  console.log(`🌐 Gateway: ${GATEWAY_HOST}:${GATEWAY_PORT}`);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('register', async (_, email: string, password: string) => {
  console.log(`[IPC] Register request received for: ${email}`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.register(email, password, BACKEND_URL);
    console.log(`[IPC] Register result:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error: any) {
    console.error(`[IPC] Register error:`, error);
    return {
      success: false,
      error: error.message || 'Registration failed',
    };
  }
});

ipcMain.handle('verifyOtp', async (_, email: string, code: string, password: string) => {
  console.log(`[IPC] Verify OTP request received for: ${email}`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.verifyOtp(email, code, password, BACKEND_URL);
    console.log(`[IPC] Verify OTP result:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error: any) {
    console.error(`[IPC] Verify OTP error:`, error);
    return {
      success: false,
      error: error.message || 'OTP verification failed',
    };
  }
});

ipcMain.handle('resendOtp', async (_, email: string) => {
  console.log(`[IPC] Resend OTP request received for: ${email}`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.resendOtp(email, BACKEND_URL);
    console.log(`[IPC] Resend OTP result:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error: any) {
    console.error(`[IPC] Resend OTP error:`, error);
    return {
      success: false,
      error: error.message || 'Resend OTP failed',
    };
  }
});

ipcMain.handle('login', async (_, email: string, password: string) => {
  console.log(`[IPC] Login request received for: ${email}`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.login(email, password, BACKEND_URL);
    console.log(`[IPC] Login result:`, result.success ? 'SUCCESS' : 'FAILED');
    return result;
  } catch (error: any) {
    console.error(`[IPC] Login error:`, error);
    return {
      success: false,
      error: error.message || 'Login failed',
    };
  }
});

ipcMain.handle('checkAuth', async () => {
  console.log(`[IPC] CheckAuth request received`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.checkToken(BACKEND_URL);
    console.log(`[IPC] CheckAuth result:`, result);
    return result;
  } catch (error: any) {
    console.error(`[IPC] CheckAuth error:`, error);
    return false;
  }
});

ipcMain.handle('getProfile', async () => {
  console.log(`[IPC] GetProfile request received`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.getProfile(BACKEND_URL);
    console.log(`[IPC] GetProfile result:`, result);
    return result;
  } catch (error: any) {
    console.error(`[IPC] GetProfile error:`, error);
    throw error;
  }
});

ipcMain.handle('getQuota', async () => {
  console.log(`[IPC] GetQuota request received`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.getQuota(BACKEND_URL);
    console.log(`[IPC] GetQuota result:`, result);
    return result;
  } catch (error: any) {
    console.error(`[IPC] GetQuota error:`, error);
    throw error;
  }
});

ipcMain.handle('getActiveProxiesCount', async () => {
  console.log(`[IPC] GetActiveProxiesCount request received`);
  console.log(`[IPC] Backend URL: ${BACKEND_URL}`);
  try {
    const result = await auth.getActiveProxiesCount(BACKEND_URL);
    console.log(`[IPC] GetActiveProxiesCount result:`, result);
    return result;
  } catch (error: any) {
    console.error(`[IPC] GetActiveProxiesCount error:`, error);
    return 0; // Return 0 on error instead of throwing
  }
});

ipcMain.handle('disconnect', async () => {
  // Gateway connection is managed by client apps directly
  // No local proxy server to disconnect
  return;
});

ipcMain.handle('connect', async () => {
  // Check authentication first
  const isAuth = await auth.checkToken(BACKEND_URL);
  if (!isAuth) {
    throw new Error('Not authenticated. Please login again.');
  }

  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated. Please login again.');
  }

  // Return gateway connection info instead of starting local proxy
  return { 
    connected: true,
    gatewayHost: GATEWAY_HOST,
    gatewayPort: GATEWAY_PORT,
    token: token // Token will be used by client apps to connect to gateway
  };
});

ipcMain.handle('checkStatus', async () => {
  // Check if user is authenticated (gateway connection is always available if authenticated)
  const isAuth = await auth.checkToken(BACKEND_URL);
  return { connected: isAuth };
});

ipcMain.handle('logout', async () => {
  console.log(`[IPC] Logout request received`);
  try {
    auth.clearAuth();
    console.log(`[IPC] Logout successful`);
    return { success: true };
  } catch (error: any) {
    console.error(`[IPC] Logout error:`, error);
    throw error;
  }
});

ipcMain.handle('changePassword', async (_event, currentPassword: string, newPassword: string) => {
  console.log(`[IPC] Change password request received`);
  try {
    const result = await auth.changePassword(BACKEND_URL, currentPassword, newPassword);
    return result;
  } catch (error: any) {
    console.error(`[IPC] Change password error:`, error);
    return {
      success: false,
      error: error.message || 'Failed to change password',
    };
  }
});

ipcMain.handle('getSystemInfo', async () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
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

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    type: os.type(),
    release: os.release(),
    cpuCount: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    localIPs,
  };
});

ipcMain.handle('reconnect', async () => {
  // Check authentication first
  const isAuth = await auth.checkToken(BACKEND_URL);
  if (!isAuth) {
    throw new Error('Not authenticated. Please login again.');
  }

  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated. Please login again.');
  }

  // Return gateway connection info
  return { 
    connected: true,
    gatewayHost: GATEWAY_HOST,
    gatewayPort: GATEWAY_PORT,
    token: token
  };
});

// Port Forward IPC Handlers
ipcMain.handle('port-forward:refresh', async () => {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  const mappings = await manager.refreshMappings(token);
  return mappings;
});

ipcMain.handle('port-forward:start', async (_event, mapping: PortMapping) => {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  await manager.startPortForward(mapping, token);
  return { success: true };
});

ipcMain.handle('port-forward:stop', async (_event, mappingId: string) => {
  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  await manager.stopPortForward(mappingId);
  return { success: true };
});

ipcMain.handle('port-forward:list', async () => {
  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  const activeIds = manager.listActivePortForwards();
  return activeIds;
});

ipcMain.handle('port-forward:start-all', async () => {
  const token = auth.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  const mappings = await manager.refreshMappings(token);
  await manager.startAllPortForwards(mappings, token);
  return { success: true, count: mappings.length };
});

ipcMain.handle('port-forward:stop-all', async () => {
  const manager = getPortForwardManager(BACKEND_URL, GATEWAY_HOST, GATEWAY_PORT);
  await manager.stopAllPortForwards();
  return { success: true };
});

// Upstreams IPC Handlers
ipcMain.handle('upstreams:getAvailable', async () => {
  try {
    const upstreamsList = await upstreams.getAvailableUpstreams(BACKEND_URL);
    return upstreamsList;
  } catch (error: any) {
    console.error('[IPC] Failed to get available upstreams:', error);
    throw error;
  }
});

ipcMain.handle('upstreams:createPurchase', async (_event, createDto: any) => {
  try {
    const result = await upstreams.createUpstreamPurchase(BACKEND_URL, createDto);
    return result;
  } catch (error: any) {
    console.error('[IPC] Failed to create upstream purchase:', error);
    throw error;
  }
});

// Payments IPC Handlers
ipcMain.handle('payments:createOrder', async (_event, createDto: any) => {
  try {
    const result = await payments.createUpstreamPaymentOrder(BACKEND_URL, createDto);
    return result;
  } catch (error: any) {
    console.error('[IPC] Failed to create payment order:', error);
    throw error;
  }
});

ipcMain.handle('payments:getOrders', async () => {
  try {
    const result = await payments.getPaymentOrders(BACKEND_URL);
    return result;
  } catch (error: any) {
    console.error('[IPC] Failed to get payment orders:', error);
    throw error;
  }
});

ipcMain.handle('payments:getOrderStatus', async (_event, orderCode: string) => {
  try {
    const result = await payments.getPaymentOrderStatus(BACKEND_URL, orderCode);
    return result;
  } catch (error: any) {
    console.error('[IPC] Failed to get payment order status:', error);
    throw error;
  }
});

