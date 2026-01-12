import React, { useState } from 'react';

interface DashboardProps {
  connected: boolean;
  quotaUsed: number;
  quotaTotal: number;
  activeProxiesCount: number;
  userEmail: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onLogout: () => void;
  onNavigateToProxies: () => void;
  onNavigateToPortForwards: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  connected,
  quotaUsed,
  quotaTotal,
  activeProxiesCount,
  userEmail,
  onConnect,
  onDisconnect,
  onReconnect,
  onLogout,
  onNavigateToProxies,
  onNavigateToPortForwards,
}) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const formatBytes = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const used = quotaUsed && !isNaN(quotaUsed) ? quotaUsed : 0;
  const total = quotaTotal && !isNaN(quotaTotal) ? quotaTotal : 0;
  const quotaPercent = total > 0 ? (used / total) * 100 : 0;
  const quotaUsedGB = used / (1024 * 1024 * 1024);
  const quotaTotalGB = total / (1024 * 1024 * 1024);

  // Use real active proxies count, but show 1 if connected locally
  const activeProxies = connected ? Math.max(1, activeProxiesCount) : activeProxiesCount;
  
  // Determine plan based on quota total
  const getPlanName = (): string => {
    const quotaGB = quotaTotalGB;
    if (quotaGB >= 1000) return 'Enterprise';
    if (quotaGB >= 500) return 'Professional';
    if (quotaGB >= 100) return 'Business';
    if (quotaGB > 0) return 'Starter';
    return 'Free';
  };

  const planName = getPlanName();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-64 flex-col border-r border-[#243647] bg-[#111a22] shrink-0`}>
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            {/* Brand / Profile Snippet */}
            <div className="flex gap-3 items-center px-2 py-2">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-primary to-purple-600"></div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-normal">ProxyManager</h1>
                <p className="text-[#93adc8] text-xs font-normal leading-normal">v2.4.0</p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#243647] cursor-pointer hover:bg-[#2f455a] transition-colors">
                <span className="text-white material-symbols-outlined" style={{ fontSize: '24px' }}>dashboard</span>
                <p className="text-white text-sm font-medium leading-normal">Dashboard</p>
              </div>
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToProxies}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>router</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Proxies</p>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPortForwards}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_bag</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Đã Mua</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group">
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>receipt_long</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Lịch sử thanh toán</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group">
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Settings</p>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors text-[#93adc8] hover:text-red-400" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Log Out</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-4 text-white">
            <button
              className="md:hidden text-white cursor-pointer material-symbols-outlined"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              menu
            </button>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Dashboard Overview</h2>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <div className="flex gap-2">
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#243647] hover:bg-[#2f455a] text-white transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
              </button>
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#243647] hover:bg-[#2f455a] text-white transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
              </button>
            </div>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border-2 border-[#243647] bg-gradient-to-br from-primary to-purple-600"></div>
          </div>
        </header>

        <div className="flex flex-col w-full max-w-[1200px] mx-auto p-4 md:p-6 gap-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Proxies Card */}
            <div className="flex flex-1 flex-col gap-2 rounded-xl p-6 border border-[#344d65] bg-[#1a2632] shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-[#93adc8] text-sm font-medium leading-normal uppercase tracking-wider">Active Proxies</p>
                <span className="material-symbols-outlined text-primary">router</span>
              </div>
              <p className="text-white tracking-tight text-3xl font-bold leading-tight mt-2">
                {activeProxies} {quotaTotal > 0 && <span className="text-[#93adc8] text-xl font-normal">active</span>}
              </p>
              <div className="flex items-center gap-1 text-[#0bda5b] text-sm font-medium leading-normal mt-1">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>trending_up</span>
                <p>{connected ? 'Gateway connection ready' : 'Not connected to gateway'}</p>
              </div>
            </div>

            {/* Bandwidth Usage Card */}
            <div className="flex flex-1 flex-col gap-2 rounded-xl p-6 border border-[#344d65] bg-[#1a2632] shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-[#93adc8] text-sm font-medium leading-normal uppercase tracking-wider">Bandwidth Usage</p>
                <span className="material-symbols-outlined text-primary">bar_chart</span>
              </div>
              <p className="text-white tracking-tight text-3xl font-bold leading-tight mt-2">
                {quotaUsedGB.toFixed(1)} <span className="text-[#93adc8] text-xl font-normal">GB</span>
              </p>
              <div className="w-full bg-[#243647] rounded-full h-1.5 mt-2">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-[#93adc8] text-xs font-medium leading-normal mt-1">
                {quotaPercent.toFixed(1)}% of {quotaTotalGB.toFixed(1)} GB Monthly Quota
              </p>
            </div>

            {/* Current Plan Card */}
            <div className="flex flex-1 flex-col gap-2 rounded-xl p-6 border border-[#344d65] bg-[#1a2632] shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-[#93adc8] text-sm font-medium leading-normal uppercase tracking-wider">Current Plan</p>
                <span className="material-symbols-outlined text-primary">workspace_premium</span>
              </div>
              <p className="text-white tracking-tight text-3xl font-bold leading-tight mt-2">{planName}</p>
              <div className="flex items-center gap-1 text-[#93adc8] text-sm font-medium leading-normal mt-1">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>email</span>
                <p className="truncate max-w-[200px]">{userEmail || 'Loading...'}</p>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-[#111a22] border border-[#344d65] rounded-xl p-4">
              <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
                {/* Connection Status */}
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    {connected && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  </div>
                  <span className={`text-sm font-medium ${connected ? 'text-emerald-500' : 'text-red-500'}`}>
                    {connected ? 'Connected to Gateway' : 'Disconnected'}
                  </span>
                  {connected && <span className="text-xs font-mono text-[#93adc8]">Gateway Ready</span>}
                </div>
              </div>

              {/* Global Actions */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                {!connected ? (
                  <button
                    onClick={onConnect}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>power</span>
                    <span>Connect to Gateway</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onDisconnect}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>power_off</span>
                      <span>Disconnect</span>
                    </button>
                    <button
                      onClick={onReconnect}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#243647] hover:bg-[#344d65] text-white text-sm font-medium rounded-lg transition-colors border border-[#344d65]"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                      <span>Reconnect</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-col border border-[#344d65] rounded-xl overflow-hidden bg-[#111a22] shadow-sm p-6">
            <h3 className="text-white text-lg font-bold mb-4">Connection Information</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#93adc8]" style={{ fontSize: '20px' }}>router</span>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Gateway Connection</span>
                  <span className="text-[#93adc8] text-xs font-mono">Direct to Gateway (TLS)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#93adc8]" style={{ fontSize: '20px' }}>security</span>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Security</span>
                  <span className="text-[#93adc8] text-xs">TLS encrypted connection</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#93adc8]" style={{ fontSize: '20px' }}>info</span>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">Usage Instructions</span>
                  <span className="text-[#93adc8] text-xs">Connect directly to gateway using your application. No local proxy needed.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
