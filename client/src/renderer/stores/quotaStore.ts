import { create } from 'zustand';

interface QuotaState {
  quotaUsed: number;
  quotaTotal: number;
  activeProxiesCount: number;
  setQuota: (used: number, total: number) => void;
  setActiveProxiesCount: (count: number) => void;
  loadQuota: () => Promise<void>;
  loadActiveProxiesCount: () => Promise<void>;
  loadDashboardData: () => Promise<void>;
}

export const useQuotaStore = create<QuotaState>((set, get) => ({
  quotaUsed: 0,
  quotaTotal: 0,
  activeProxiesCount: 0,

  setQuota: (used: number, total: number) => set({ quotaUsed: used, quotaTotal: total }),
  setActiveProxiesCount: (count: number) => set({ activeProxiesCount: count }),

  loadQuota: async () => {
    try {
      const quota = await window.electronAPI?.getQuota();
      if (quota) {
        set({ quotaUsed: quota.used, quotaTotal: quota.total });
      }
    } catch (err) {
      console.error('[QuotaStore] Failed to load quota:', err);
    }
  },

  loadActiveProxiesCount: async () => {
    try {
      const count = await window.electronAPI?.getActiveProxiesCount();
      if (count !== undefined) {
        set({ activeProxiesCount: count });
      }
    } catch (err) {
      console.error('[QuotaStore] Failed to load active proxies count:', err);
    }
  },

  loadDashboardData: async () => {
    try {
      // Load profile
      const profile = await window.electronAPI?.getProfile();
      if (profile) {
        // Update user email in auth store
        const { useAuthStore } = await import('./authStore');
        useAuthStore.getState().setUserEmail(profile.email);
      }

      // Load quota
      await get().loadQuota();

      // Load active proxies count
      await get().loadActiveProxiesCount();
    } catch (err) {
      console.error('[QuotaStore] Failed to load dashboard data:', err);
    }
  },
}));
