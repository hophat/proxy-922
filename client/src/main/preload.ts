import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Preload script loaded');
console.log('[Preload] contextBridge available:', typeof contextBridge !== 'undefined');
console.log('[Preload] ipcRenderer available:', typeof ipcRenderer !== 'undefined');

// Expose electronAPI to renderer
try {
  const electronAPI = {
    register: (email: string, password: string) => {
      console.log('[Preload] register called with email:', email);
      return ipcRenderer.invoke('register', email, password);
    },
    login: (email: string, password: string) => {
      console.log('[Preload] login called with email:', email);
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
      getOrderStatus: (orderCode: string) => {
        console.log('[Preload] payments.getOrderStatus called');
        return ipcRenderer.invoke('payments:getOrderStatus', orderCode);
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

