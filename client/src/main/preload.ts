import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Preload script loaded');
console.log('[Preload] contextBridge available:', typeof contextBridge !== 'undefined');
console.log('[Preload] ipcRenderer available:', typeof ipcRenderer !== 'undefined');

// Expose electronAPI to renderer
try {
  const electronAPI = {
    register: (email: string, password: string) => {
      // SECURITY: Do not log email or password
      console.log('[Preload] register called');
      return ipcRenderer.invoke('register', email, password);
    },
    verifyOtp: (email: string, code: string, password: string) => {
      console.log('[Preload] verifyOtp called');
      return ipcRenderer.invoke('verifyOtp', email, code, password);
    },
    resendOtp: (email: string) => {
      console.log('[Preload] resendOtp called');
      return ipcRenderer.invoke('resendOtp', email);
    },
    login: (email: string, password: string) => {
      // SECURITY: Do not log email or password
      console.log('[Preload] login called');
      return ipcRenderer.invoke('login', email, password);
    },
    checkAuth: () => {
      console.log('[Preload] checkAuth called');
      return ipcRenderer.invoke('checkAuth');
    },
    getProfile: () => {
      console.log('[Preload] getProfile called');
      return ipcRenderer.invoke('getProfile');
    },
    getQuota: () => {
      console.log('[Preload] getQuota called');
      return ipcRenderer.invoke('getQuota');
    },
    getActiveProxiesCount: () => {
      console.log('[Preload] getActiveProxiesCount called');
      return ipcRenderer.invoke('getActiveProxiesCount');
    },
    disconnect: () => {
      console.log('[Preload] disconnect called');
      return ipcRenderer.invoke('disconnect');
    },
    connect: () => {
      console.log('[Preload] connect called');
      return ipcRenderer.invoke('connect');
    },
    checkStatus: () => {
      console.log('[Preload] checkStatus called');
      return ipcRenderer.invoke('checkStatus');
    },
    reconnect: () => {
      console.log('[Preload] reconnect called');
      return ipcRenderer.invoke('reconnect');
    },
    logout: () => {
      console.log('[Preload] logout called');
      return ipcRenderer.invoke('logout');
    },
    changePassword: (currentPassword: string, newPassword: string) => {
      console.log('[Preload] changePassword called');
      return ipcRenderer.invoke('changePassword', currentPassword, newPassword);
    },
    getSystemInfo: () => {
      console.log('[Preload] getSystemInfo called');
      return ipcRenderer.invoke('getSystemInfo');
    },
    portForward: {
      refresh: () => {
        console.log('[Preload] portForward.refresh called');
        return ipcRenderer.invoke('port-forward:refresh');
      },
      start: (mapping: any) => {
        console.log('[Preload] portForward.start called');
        return ipcRenderer.invoke('port-forward:start', mapping);
      },
      stop: (mappingId: string) => {
        console.log('[Preload] portForward.stop called');
        return ipcRenderer.invoke('port-forward:stop', mappingId);
      },
      list: () => {
        console.log('[Preload] portForward.list called');
        return ipcRenderer.invoke('port-forward:list');
      },
      startAll: () => {
        console.log('[Preload] portForward.startAll called');
        return ipcRenderer.invoke('port-forward:start-all');
      },
      stopAll: () => {
        console.log('[Preload] portForward.stopAll called');
        return ipcRenderer.invoke('port-forward:stop-all');
      },
      changePort: (mappingId: string, newPort: number) => {
        console.log('[Preload] portForward.changePort called');
        return ipcRenderer.invoke('port-forward:change-port', mappingId, newPort);
      },
      getGateways: () => {
        console.log('[Preload] portForward.getGateways called');
        return ipcRenderer.invoke('port-forward:get-gateways');
      },
      getAvailablePorts: () => {
        console.log('[Preload] portForward.getAvailablePorts called');
        return ipcRenderer.invoke('port-forward:get-available-ports');
      },
    },
    upstreams: {
      getAvailable: () => {
        console.log('[Preload] upstreams.getAvailable called');
        return ipcRenderer.invoke('upstreams:getAvailable');
      },
      createPurchase: (createDto: any) => {
        console.log('[Preload] upstreams.createPurchase called');
        return ipcRenderer.invoke('upstreams:createPurchase', createDto);
      },
    },
    payments: {
      createOrder: (createDto: any) => {
        console.log('[Preload] payments.createOrder called');
        return ipcRenderer.invoke('payments:createOrder', createDto);
      },
      createRotatingProxyOrder: (createDto: any) => {
        console.log('[Preload] payments.createRotatingProxyOrder called');
        return ipcRenderer.invoke('payments:createRotatingProxyOrder', createDto);
      },
      getOrders: () => {
        console.log('[Preload] payments.getOrders called');
        return ipcRenderer.invoke('payments:getOrders');
      },
      getOrderStatus: (orderCode: string) => {
        console.log('[Preload] payments.getOrderStatus called');
        return ipcRenderer.invoke('payments:getOrderStatus', orderCode);
      },
      getMyRotatingProxies: () => {
        console.log('[Preload] payments.getMyRotatingProxies called');
        return ipcRenderer.invoke('payments:getMyRotatingProxies');
      },
      updateRotatingProxyPort: (id: string, port: number) => {
        console.log('[Preload] payments.updateRotatingProxyPort called');
        return ipcRenderer.invoke('payments:updateRotatingProxyPort', id, port);
      },
      updateRotatingProxyRotationInterval: (id: string, rotationInterval: number) => {
        console.log('[Preload] payments.updateRotatingProxyRotationInterval called');
        return ipcRenderer.invoke('payments:updateRotatingProxyRotationInterval', id, rotationInterval);
      },
    },
    rotatingProxy: {
      startServer: (id: string, port: number) => {
        console.log('[Preload] rotatingProxy.startServer called');
        return ipcRenderer.invoke('rotating-proxy:startServer', id, port);
      },
      stopServer: (id: string) => {
        console.log('[Preload] rotatingProxy.stopServer called');
        return ipcRenderer.invoke('rotating-proxy:stopServer', id);
      },
      isServerRunning: (id: string) => {
        console.log('[Preload] rotatingProxy.isServerRunning called');
        return ipcRenderer.invoke('rotating-proxy:isServerRunning', id);
      },
      getPublicIP: () => {
        console.log('[Preload] rotatingProxy.getPublicIP called');
        return ipcRenderer.invoke('rotating-proxy:getPublicIP');
      },
      startAllServers: () => {
        console.log('[Preload] rotatingProxy.startAllServers called');
        return ipcRenderer.invoke('rotating-proxy:startAllServers');
      },
      stopAllServers: () => {
        console.log('[Preload] rotatingProxy.stopAllServers called');
        return ipcRenderer.invoke('rotating-proxy:stopAllServers');
      },
    },
    update: {
      checkForUpdates: () => {
        console.log('[Preload] update.checkForUpdates called');
        return ipcRenderer.invoke('checkForUpdates');
      },
      downloadUpdate: (downloadUrl: string) => {
        console.log('[Preload] update.downloadUpdate called');
        return ipcRenderer.invoke('downloadUpdate', downloadUrl);
      },
      installUpdate: (filePath: string) => {
        console.log('[Preload] update.installUpdate called');
        return ipcRenderer.invoke('installUpdate', filePath);
      },
      getUpdateStatus: () => {
        console.log('[Preload] update.getUpdateStatus called');
        return ipcRenderer.invoke('getUpdateStatus');
      },
      getCurrentVersion: () => {
        console.log('[Preload] update.getCurrentVersion called');
        return ipcRenderer.invoke('getCurrentVersion');
      },
    },
  };

  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('[Preload] electronAPI exposed successfully');
  console.log('[Preload] electronAPI object:', Object.keys(electronAPI));
  
  // Also set a flag on window to indicate preload is ready
  contextBridge.exposeInMainWorld('__PRELOAD_READY__', true);
  console.log('[Preload] Preload ready flag set');
} catch (error) {
  console.error('[Preload] Error exposing electronAPI:', error);
  // Try to expose error to window for debugging
  try {
    contextBridge.exposeInMainWorld('__PRELOAD_ERROR__', String(error));
  } catch (e) {
    // Ignore
  }
}

