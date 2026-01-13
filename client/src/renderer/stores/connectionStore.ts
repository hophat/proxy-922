import { create } from 'zustand';

interface ConnectionState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connected: false,

  setConnected: (connected: boolean) => set({ connected }),

  connect: async () => {
    try {
      console.log('[ConnectionStore] Connecting to Gateway...');
      const result = await window.electronAPI?.connect();
      if (result?.connected) {
        set({ connected: true });
        console.log('[ConnectionStore] Gateway connection ready');
      } else {
        console.error('[ConnectionStore] Failed to connect to gateway');
      }
    } catch (err: any) {
      console.error('[ConnectionStore] Connect error:', err);
      throw err;
    }
  },

  disconnect: async () => {
    try {
      await window.electronAPI?.disconnect();
      set({ connected: false });
    } catch (err) {
      console.error('[ConnectionStore] Failed to disconnect:', err);
    }
  },

  reconnect: async () => {
    try {
      console.log('[ConnectionStore] Reconnecting to Gateway...');
      const result = await window.electronAPI?.reconnect();
      if (result?.connected) {
        set({ connected: true });
        console.log('[ConnectionStore] Gateway reconnected successfully');
      } else {
        console.error('[ConnectionStore] Failed to reconnect to gateway');
      }
    } catch (err: any) {
      console.error('[ConnectionStore] Reconnect error:', err);
      throw err;
    }
  },

  checkStatus: async () => {
    try {
      const result = await window.electronAPI?.checkStatus();
      if (result) {
        set({ connected: result.connected });
      }
    } catch (err) {
      console.error('[ConnectionStore] Failed to check proxy status:', err);
    }
  },
}));
