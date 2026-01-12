import React, { useState, useEffect } from 'react';
import { Login } from './login';
import { Dashboard } from './dashboard';
import { Proxies } from './proxies';
import { PortForwards } from './port-forwards';

type Route = 'dashboard' | 'proxies' | 'port-forwards';

export const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<Route>('dashboard');
  const [connected, setConnected] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaTotal, setQuotaTotal] = useState(0);
  const [activeProxiesCount, setActiveProxiesCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    console.log('[Renderer] App mounted, checking auth...');
    
    const win = window as any;
    console.log('[Renderer] __PRELOAD_READY__:', win.__PRELOAD_READY__);
    console.log('[Renderer] __PRELOAD_ERROR__:', win.__PRELOAD_ERROR__);
    console.log('[Renderer] electronAPI type:', typeof win.electronAPI);
    
    // Wait for electronAPI to be available (preload script may load after renderer)
    const checkElectronAPI = (retries = 0) => {
      console.log(`[Renderer] Checking electronAPI... (attempt ${retries + 1})`);
      
      // Check for preload ready flag first
      const preloadReady = win.__PRELOAD_READY__;
      const hasAPI = !!win.electronAPI;
      
      console.log('[Renderer] Preload ready:', preloadReady);
      console.log('[Renderer] electronAPI available:', hasAPI);
      
      if (hasAPI && typeof win.electronAPI === 'object') {
        console.log('[Renderer] ✅ electronAPI found! Methods:', Object.keys(win.electronAPI));
        console.log('[Renderer] Calling checkAuth...');
        win.electronAPI.checkAuth().then((authenticated: boolean) => {
          console.log('[Renderer] checkAuth result:', authenticated);
          if (authenticated) {
            setIsLoggedIn(true);
            loadDashboardData();
            // Check proxy status when authenticated
            checkProxyStatus();
          }
        }).catch((err: any) => {
          console.error('[Renderer] checkAuth error:', err);
        });
        return; // Success, stop retrying
      }
      
      if (retries < 30) {
        console.warn(`[Renderer] Waiting for electronAPI... (${retries + 1}/30)`);
        setTimeout(() => checkElectronAPI(retries + 1), 100);
      } else {
        console.error('[Renderer] ❌ electronAPI still not available after 30 retries!');
        console.error('[Renderer] Preload ready flag:', preloadReady);
        console.error('[Renderer] Preload error:', win.__PRELOAD_ERROR__);
        console.error('[Renderer] Window keys containing "electron" or "API":', 
          Object.keys(win).filter(k => 
            k.toLowerCase().includes('electron') || 
            k.toLowerCase().includes('api') || 
            k.toLowerCase().includes('preload')
          )
        );
      }
    };
    
    // Start checking
    checkElectronAPI();
  }, []);

  // Check proxy status periodically when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkProxyStatus = async () => {
      try {
        const result = await window.electronAPI?.checkStatus();
        if (result) {
          setConnected(result.connected);
        }
      } catch (err) {
        console.error('[Renderer] Failed to check proxy status:', err);
      }
    };

    // Check immediately
    checkProxyStatus();

    // Check every 2 seconds
    const interval = setInterval(checkProxyStatus, 2000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Refresh dashboard data periodically
  useEffect(() => {
    if (!isLoggedIn) return;

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const loadDashboardData = async () => {
    try {
      // Load profile
      const profile = await window.electronAPI?.getProfile();
      if (profile) {
        setUserEmail(profile.email);
      }

      // Load quota
      const quota = await window.electronAPI?.getQuota();
      if (quota) {
        setQuotaUsed(quota.used);
        setQuotaTotal(quota.total);
      }

      // Load active proxies count
      const count = await window.electronAPI?.getActiveProxiesCount();
      if (count !== undefined) {
        setActiveProxiesCount(count);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleRegister = async (email: string, password: string) => {
    console.log('[Renderer] handleRegister called with email:', email);
    
    if (!window.electronAPI) {
      setError('electronAPI is not available. Please restart the app.');
      return;
    }

    try {
      setError(undefined);
      const result = await window.electronAPI.register(email, password);
      if (result?.success) {
        // Registration successful, show success message (handled in Login component)
        return;
      } else {
        setError(result?.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('[Renderer] Register error:', err);
      setError(err.message || 'Registration failed');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    console.log('[Renderer] handleLogin called with email:', email);
    console.log('[Renderer] electronAPI available:', !!window.electronAPI);
    console.log('[Renderer] window.electronAPI type:', typeof window.electronAPI);
    
    // Wait for electronAPI if not available yet
    let retries = 0;
    while (!window.electronAPI && retries < 10) {
      console.log(`[Renderer] Waiting for electronAPI... (attempt ${retries + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!window.electronAPI) {
      const errorMsg = 'electronAPI is not available. Please restart the app.';
      console.error('[Renderer]', errorMsg);
      console.error('[Renderer] window object:', window);
      console.error('[Renderer] Available window keys:', Object.keys(window).filter(k => k.includes('electron') || k.includes('API')));
      setError(errorMsg);
      return;
    }

    try {
      setError(undefined);
      console.log('[Renderer] Calling window.electronAPI.login...');
      const result = await window.electronAPI.login(email, password);
      console.log('[Renderer] Login result received:', result);
      
      if (result?.success) {
        setIsLoggedIn(true);
        setQuotaUsed(result.quotaUsed || 0);
        setQuotaTotal(result.quotaTotal || 0);
        loadDashboardData();
      } else {
        setError(result?.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('[Renderer] Login error:', err);
      setError(err.message || 'Login failed');
    }
  };

  const handleConnect = async () => {
    try {
      setError(undefined);
      console.log('[Renderer] Connecting to Gateway...');
      const result = await window.electronAPI?.connect();
      if (result?.connected) {
        setConnected(true);
        console.log('[Renderer] Gateway connection ready');
      } else {
        console.error('[Renderer] Failed to connect to gateway');
        setError('Failed to connect to gateway');
      }
    } catch (err: any) {
      console.error('[Renderer] Connect error:', err);
      const errorMsg = err.message || 'Failed to connect';
      setError(errorMsg);
      
      // If not authenticated, suggest to login again
      if (errorMsg.includes('Not authenticated')) {
        // Optionally, you could auto-logout here
        // setIsLoggedIn(false);
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.electronAPI?.disconnect();
      setConnected(false);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleReconnect = async () => {
    try {
      console.log('[Renderer] Reconnecting to Gateway...');
      const result = await window.electronAPI?.reconnect();
      if (result?.connected) {
        setConnected(true);
        console.log('[Renderer] Gateway reconnected successfully');
      } else {
        console.error('[Renderer] Failed to reconnect to gateway');
        setError('Failed to reconnect to gateway');
      }
    } catch (err: any) {
      console.error('[Renderer] Reconnect error:', err);
      setError(err.message || 'Failed to reconnect');
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI?.logout();
      setIsLoggedIn(false);
      setConnected(false);
      setQuotaUsed(0);
      setQuotaTotal(0);
      setError(undefined);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} error={error} />;
  }

  if (currentRoute === 'proxies') {
    return (
      <Proxies
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigateToDashboard={() => setCurrentRoute('dashboard')}
        onNavigateToPortForwards={() => setCurrentRoute('port-forwards')}
      />
    );
  }

  if (currentRoute === 'port-forwards') {
    return (
      <PortForwards
        userEmail={userEmail}
        onLogout={handleLogout}
        onNavigateToDashboard={() => setCurrentRoute('dashboard')}
        onNavigateToProxies={() => setCurrentRoute('proxies')}
      />
    );
  }

  return (
    <Dashboard
      connected={connected}
      quotaUsed={quotaUsed}
      quotaTotal={quotaTotal}
      activeProxiesCount={activeProxiesCount}
      userEmail={userEmail}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onReconnect={handleReconnect}
      onLogout={handleLogout}
      onNavigateToProxies={() => setCurrentRoute('proxies')}
      onNavigateToPortForwards={() => setCurrentRoute('port-forwards')}
    />
  );
};

// Extend Window interface
declare global {
  interface Window {
    electronAPI?: {
      login: (email: string, password: string) => Promise<{
        success: boolean;
        error?: string;
        quotaUsed?: number;
        quotaTotal?: number;
      }>;
      checkAuth: () => Promise<boolean>;
      getProfile: () => Promise<{ userId: string; email: string }>;
      getQuota: () => Promise<{ used: number; total: number }>;
      getActiveProxiesCount: () => Promise<number>;
      disconnect: () => Promise<void>;
      connect: () => Promise<{ connected: boolean }>;
      checkStatus: () => Promise<{ connected: boolean }>;
      reconnect: () => Promise<{ connected: boolean }>;
      logout: () => Promise<{ success: boolean }>;
      portForward: {
        refresh: () => Promise<any[]>;
        start: (mapping: any) => Promise<{ success: boolean }>;
        stop: (mappingId: string) => Promise<{ success: boolean }>;
        list: () => Promise<string[]>;
        startAll: () => Promise<{ success: boolean; count: number }>;
        stopAll: () => Promise<{ success: boolean }>;
      };
      upstreams: {
        getAvailable: () => Promise<any[]>;
        createPurchase: (createDto: any) => Promise<any>;
      };
    };
  }
}

