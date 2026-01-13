import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  userEmail: string;
  error: string | undefined;
  checkingAuth: boolean; // Đang check auth hay không
  setLoggedIn: (value: boolean) => void;
  setUserEmail: (email: string) => void;
  setError: (error: string | undefined) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; quotaUsed?: number; quotaTotal?: number; error?: string } | undefined>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  register: (email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOtp: (email: string, code: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  userEmail: '',
  error: undefined,
  checkingAuth: true, // Bắt đầu với checkingAuth = true

  setLoggedIn: (value: boolean) => set({ isLoggedIn: value }),
  setUserEmail: (email: string) => set({ userEmail: email }),
  setError: (error: string | undefined) => set({ error }),

  login: async (email: string, password: string) => {
    // SECURITY: Do not log email or password
    console.log('[AuthStore] Login called');
    
    // Wait for electronAPI if not available yet
    let retries = 0;
    while (!window.electronAPI && retries < 10) {
      console.log(`[AuthStore] Waiting for electronAPI... (attempt ${retries + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!window.electronAPI) {
      const errorMsg = 'electronAPI is not available. Please restart the app.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }

    try {
      set({ error: undefined });
      console.log('[AuthStore] Calling window.electronAPI.login...');
      const result = await window.electronAPI.login(email, password);
      console.log('[AuthStore] Login result received:', result);
      
      if (result?.success) {
        set({ 
          isLoggedIn: true,
          error: undefined 
        });
        return {
          success: true,
          quotaUsed: result.quotaUsed,
          quotaTotal: result.quotaTotal,
        };
      } else {
        set({ error: result?.error || 'Login failed' });
        return {
          success: false,
          error: result?.error || 'Login failed',
        };
      }
    } catch (err: any) {
      console.error('[AuthStore] Login error:', err);
      const errorMsg = err.message || 'Login failed';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await window.electronAPI?.logout();
      set({ 
        isLoggedIn: false,
        userEmail: '',
        error: undefined,
        checkingAuth: false 
      });
    } catch (err) {
      console.error('[AuthStore] Failed to logout:', err);
      set({ checkingAuth: false });
    }
  },

  checkAuth: async () => {
    try {
      set({ checkingAuth: true });
      const authenticated = await window.electronAPI?.checkAuth();
      if (authenticated) {
        set({ isLoggedIn: true, checkingAuth: false });
      } else {
        set({ checkingAuth: false });
      }
    } catch (err) {
      console.error('[AuthStore] checkAuth error:', err);
      set({ checkingAuth: false });
    }
  },

  register: async (email: string, password: string) => {
    // SECURITY: Do not log email
    console.log('[AuthStore] handleRegister called');
    
    if (!window.electronAPI) {
      const errorMsg = 'electronAPI is not available. Please restart the app.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }

    try {
      set({ error: undefined });
      const result = await window.electronAPI.register(email, password);
      return result || { success: false, error: 'Registration failed' };
    } catch (err: any) {
      console.error('[AuthStore] Register error:', err);
      const errorMsg = err.message || 'Registration failed';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  verifyOtp: async (email: string, code: string, password: string) => {
    console.log('[AuthStore] handleVerifyOtp called');
    
    if (!window.electronAPI) {
      const errorMsg = 'electronAPI is not available. Please restart the app.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }

    try {
      set({ error: undefined });
      const result = await window.electronAPI.verifyOtp(email, code, password);
      return result || { success: false, error: 'OTP verification failed' };
    } catch (err: any) {
      console.error('[AuthStore] Verify OTP error:', err);
      const errorMsg = err.message || 'OTP verification failed';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  resendOtp: async (email: string) => {
    console.log('[AuthStore] handleResendOtp called');
    
    if (!window.electronAPI) {
      const errorMsg = 'electronAPI is not available. Please restart the app.';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }

    try {
      set({ error: undefined });
      const result = await window.electronAPI.resendOtp(email);
      return result || { success: false, error: 'Resend OTP failed' };
    } catch (err: any) {
      console.error('[AuthStore] Resend OTP error:', err);
      const errorMsg = err.message || 'Resend OTP failed';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },
}));
