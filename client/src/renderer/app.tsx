import React, { useState, useEffect } from 'react';
import { Login } from './login';
import { Register } from './register';
import { Dashboard } from './dashboard';
import { Proxies } from './proxies';
import { PortForwards } from './port-forwards';
import { RotatingProxies } from './rotating-proxies';
import { PaymentHistory } from './PaymentHistory';
import { Settings } from './Settings';
import { UpdateDialog } from './UpdateDialog';
import {
  useAuthStore,
  useConnectionStore,
  useQuotaStore,
  useNavigationStore,
  useUpdateStore,
} from './stores';

export const App: React.FC = () => {
  // Store hooks
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const checkingAuth = useAuthStore((state) => state.checkingAuth);
  const userEmail = useAuthStore((state) => state.userEmail);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const register = useAuthStore((state) => state.register);
  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const resendOtp = useAuthStore((state) => state.resendOtp);
  const setError = useAuthStore((state) => state.setError);
  const setLoggedIn = useAuthStore((state) => state.setLoggedIn);

  const connected = useConnectionStore((state) => state.connected);
  const connect = useConnectionStore((state) => state.connect);
  const disconnect = useConnectionStore((state) => state.disconnect);
  const reconnect = useConnectionStore((state) => state.reconnect);
  const checkStatus = useConnectionStore((state) => state.checkStatus);
  const setConnected = useConnectionStore((state) => state.setConnected);

  const quotaUsed = useQuotaStore((state) => state.quotaUsed);
  const quotaTotal = useQuotaStore((state) => state.quotaTotal);
  const activeProxiesCount = useQuotaStore((state) => state.activeProxiesCount);
  const setQuota = useQuotaStore((state) => state.setQuota);
  const loadDashboardData = useQuotaStore((state) => state.loadDashboardData);

  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const showUpdateDialog = useUpdateStore((state) => state.showUpdateDialog);
  const isDownloading = useUpdateStore((state) => state.isDownloading);
  const downloadProgress = useUpdateStore((state) => state.downloadProgress);
  const isDownloaded = useUpdateStore((state) => state.isDownloaded);
  const isInstalling = useUpdateStore((state) => state.isInstalling);
  const setUpdateInfo = useUpdateStore((state) => state.setUpdateInfo);
  const showDialog = useUpdateStore((state) => state.showDialog);
  const closeDialog = useUpdateStore((state) => state.closeDialog);
  const downloadUpdate = useUpdateStore((state) => state.downloadUpdate);
  const installUpdate = useUpdateStore((state) => state.installUpdate);
  const setDownloadProgress = useUpdateStore((state) => state.setDownloadProgress);

  // Local state for register dialog
  const [showRegister, setShowRegister] = useState(false);

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
        checkAuth().then(() => {
          // Use setTimeout to ensure state is updated
          setTimeout(() => {
            const loggedIn = useAuthStore.getState().isLoggedIn;
            if (loggedIn) {
              loadDashboardData();
              // Check proxy status when authenticated
              checkStatus();
            }
          }, 100);
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

    // Check immediately
    checkStatus();

    // Check every 2 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoggedIn, checkStatus]);

  // Refresh dashboard data periodically
  useEffect(() => {
    if (!isLoggedIn) return;

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn, loadDashboardData]);

  // Listen for update events from main process
  useEffect(() => {
    // Use electron's IPC via window.require for renderer process
    const electron = (window as any).require?.('electron');
    const ipcRenderer = electron?.ipcRenderer;
    
    if (!ipcRenderer) {
      console.warn('[Renderer] IPC renderer not available, update notifications may not work');
      return;
    }

    const handleUpdateAvailable = (event: any, info: any) => {
      console.log('[Renderer] Update available:', info);
      setUpdateInfo(info);
      showDialog();
    };

    const handleDownloadProgress = (event: any, progress: number) => {
      console.log('[Renderer] Download progress:', progress);
      setDownloadProgress(progress);
    };

    ipcRenderer.on('update:available', handleUpdateAvailable);
    ipcRenderer.on('update:download-progress', handleDownloadProgress);

    return () => {
      ipcRenderer.removeListener('update:available', handleUpdateAvailable);
      ipcRenderer.removeListener('update:download-progress', handleDownloadProgress);
    };
  }, [setUpdateInfo, showDialog, setDownloadProgress]);

  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    // After successful login, check if logged in and load dashboard data
    if (result?.success) {
      // Set quota from login result if available
      if (result.quotaUsed !== undefined && result.quotaTotal !== undefined) {
        setQuota(result.quotaUsed, result.quotaTotal);
      }
      loadDashboardData();
    }
  };

  const handleConnect = async () => {
    try {
      setError(undefined);
      await connect();
    } catch (err: any) {
      console.error('[Renderer] Connect error:', err);
      const errorMsg = err.message || 'Failed to connect';
      setError(errorMsg);
      
      // If not authenticated, suggest to login again
      if (errorMsg.includes('Not authenticated')) {
        // Optionally, you could auto-logout here
        // setLoggedIn(false);
      }
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (err: any) {
      console.error('[Renderer] Reconnect error:', err);
      setError(err.message || 'Failed to reconnect');
    }
  };

  const handleLogout = async () => {
    await logout();
    setConnected(false);
    setQuota(0, 0);
  };

  const handleDownloadUpdate = async (downloadUrl: string) => {
    try {
      await downloadUpdate(downloadUrl);
    } catch (error: any) {
      console.error('Failed to download update:', error);
      setError(error.message || 'Failed to download update');
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await installUpdate();
    } catch (error: any) {
      console.error('Failed to install update:', error);
      setError(error.message || 'Failed to install update');
    }
  };

  // Hiển thị loading khi đang check auth, không hiển thị login ngay
  if (checkingAuth) {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display text-white flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
          <p className="text-[#93adc8]">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (showRegister) {
      return (
        <>
          <Register
            onRegister={register}
            onVerifyOtp={verifyOtp}
            onResendOtp={resendOtp}
            onBackToLogin={() => setShowRegister(false)}
            error={error}
          />
          {showUpdateDialog && updateInfo && (
            <UpdateDialog
              updateInfo={updateInfo}
              open={showUpdateDialog}
              onClose={closeDialog}
              onDownload={handleDownloadUpdate}
              downloadProgress={downloadProgress}
              isDownloading={isDownloading}
              isDownloaded={isDownloaded}
              onInstall={handleInstallUpdate}
              isInstalling={isInstalling}
            />
          )}
        </>
      );
    }
    return (
      <>
        <Login onLogin={handleLogin} onRegister={() => setShowRegister(true)} error={error} />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  if (currentRoute === 'proxies') {
    return (
      <>
        <Proxies
          onLogout={handleLogout}
        />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  if (currentRoute === 'port-forwards') {
    return (
      <>
        <PortForwards
          onLogout={handleLogout}
        />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  if (currentRoute === 'rotating-proxies') {
    return (
      <>
        <RotatingProxies
          onLogout={handleLogout}
        />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  if (currentRoute === 'payment-history') {
    return (
      <>
        <PaymentHistory
          onLogout={handleLogout}
        />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  if (currentRoute === 'settings') {
    return (
      <>
        <Settings
          onLogout={handleLogout}
        />
        {showUpdateDialog && updateInfo && (
          <UpdateDialog
            updateInfo={updateInfo}
            open={showUpdateDialog}
            onClose={closeDialog}
            onDownload={handleDownloadUpdate}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
            onInstall={handleInstallUpdate}
            isInstalling={isInstalling}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dashboard
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onReconnect={handleReconnect}
        onLogout={handleLogout}
      />
      {showUpdateDialog && updateInfo && (
        <UpdateDialog
          updateInfo={updateInfo}
          open={showUpdateDialog}
          onClose={closeDialog}
          onDownload={handleDownloadUpdate}
          downloadProgress={downloadProgress}
          isDownloading={isDownloading}
          isDownloaded={isDownloaded}
          onInstall={handleInstallUpdate}
          isInstalling={isInstalling}
        />
      )}
    </>
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
      register: (email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      verifyOtp: (email: string, code: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      resendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      checkAuth: () => Promise<boolean>;
      getProfile: () => Promise<{ userId: string; email: string }>;
      getQuota: () => Promise<{ used: number; total: number }>;
      getActiveProxiesCount: () => Promise<number>;
      disconnect: () => Promise<void>;
      connect: () => Promise<{ connected: boolean }>;
      checkStatus: () => Promise<{ connected: boolean }>;
      reconnect: () => Promise<{ connected: boolean }>;
      logout: () => Promise<{ success: boolean }>;
      changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      getSystemInfo: () => Promise<{
        hostname: string;
        platform: string;
        arch: string;
        type: string;
        release: string;
        cpuCount: number;
        totalMemory: number;
        freeMemory: number;
        uptime: number;
        localIPs: string[];
      }>;
      verifyOtp: (email: string, code: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      resendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      portForward: {
        refresh: () => Promise<any[]>;
        start: (mapping: any) => Promise<{ success: boolean }>;
        stop: (mappingId: string) => Promise<{ success: boolean }>;
        list: () => Promise<string[]>;
        startAll: () => Promise<{ success: boolean; count: number }>;
        stopAll: () => Promise<{ success: boolean }>;
        changePort: (mappingId: string, newPort: number) => Promise<any>;
        getGateways: () => Promise<Array<{ id: string; ip: string }>>;
        getAvailablePorts: () => Promise<Array<{ port: number; gatewayId: string; gatewayIp: string; portId: string }>>;
      };
      upstreams: {
        getAvailable: () => Promise<any[]>;
        createPurchase: (createDto: any) => Promise<any>;
      };
      payments: {
        createOrder: (createDto: any) => Promise<any>;
        getOrders: () => Promise<any[]>;
        getOrderStatus: (orderCode: string) => Promise<any>;
      };
      update?: {
        checkForUpdates: () => Promise<{
          hasUpdate: boolean;
          version?: string;
          platform?: string;
          downloadUrl?: string;
          releaseNotes?: string;
          isMandatory?: boolean;
          fileSize?: number;
          checksum?: string;
          createdAt?: string;
        }>;
        downloadUpdate: (downloadUrl: string) => Promise<string>;
        installUpdate: (filePath: string) => Promise<{ success: boolean }>;
        getUpdateStatus: () => Promise<{
          status: 'idle' | 'checking' | 'downloading' | 'downloaded' | 'installing' | 'error';
          progress?: number;
          error?: string;
          downloadedPath?: string;
        }>;
        getCurrentVersion: () => Promise<string>;
      };
    };
  }
}
