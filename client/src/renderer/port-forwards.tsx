import React, { useState, useEffect } from 'react';

interface PortMapping {
  mappingId: string;
  gatewayIp: string;
  gatewayPort: number;
  localPort: number;
  username: string;
  password: string;
  upstreamId: string;
  upstreamHost: string;
  upstreamPort: number;
  status: string;
  expiresAt: string;
}

interface PortForwardsProps {
  userEmail: string;
  onLogout: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToProxies: () => void;
}

export const PortForwards: React.FC<PortForwardsProps> = ({
  userEmail,
  onLogout,
  onNavigateToDashboard,
  onNavigateToProxies,
}) => {
  const [mappings, setMappings] = useState<PortMapping[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const data = await window.electronAPI?.portForward.refresh();
      if (data) {
        setMappings(data);
      }
    } catch (err: any) {
      console.error('Failed to load mappings:', err);
      setError(err.message || 'Failed to load port mappings');
    } finally {
      setLoading(false);
    }
  };

  const loadActivePortForwards = async () => {
    try {
      const ids = await window.electronAPI?.portForward.list();
      if (ids) {
        setActiveIds(new Set(ids));
      }
    } catch (err) {
      console.error('Failed to load active port forwards:', err);
    }
  };

  useEffect(() => {
    loadMappings();
    loadActivePortForwards();
    const interval = setInterval(() => {
      loadActivePortForwards();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (mapping: PortMapping) => {
    try {
      setError(undefined);
      await window.electronAPI?.portForward.start(mapping);
      await loadActivePortForwards();
    } catch (err: any) {
      console.error('Failed to start port forward:', err);
      setError(err.message || 'Failed to start port forward');
    }
  };

  const handleStop = async (mappingId: string) => {
    try {
      setError(undefined);
      await window.electronAPI?.portForward.stop(mappingId);
      await loadActivePortForwards();
    } catch (err: any) {
      console.error('Failed to stop port forward:', err);
      setError(err.message || 'Failed to stop port forward');
    }
  };

  const handleStartAll = async () => {
    try {
      setError(undefined);
      await window.electronAPI?.portForward.startAll();
      await loadActivePortForwards();
    } catch (err: any) {
      console.error('Failed to start all port forwards:', err);
      setError(err.message || 'Failed to start all port forwards');
    }
  };

  const handleStopAll = async () => {
    try {
      setError(undefined);
      await window.electronAPI?.portForward.stopAll();
      await loadActivePortForwards();
    } catch (err: any) {
      console.error('Failed to stop all port forwards:', err);
      setError(err.message || 'Failed to stop all port forwards');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isActive = (mappingId: string) => activeIds.has(mappingId);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[#243647] bg-[#111a22] shrink-0">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center px-2 py-2">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-primary to-purple-600"></div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-normal">ProxyManager</h1>
                <p className="text-[#93adc8] text-xs font-normal leading-normal">v2.4.0</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToDashboard}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>dashboard</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Dashboard</p>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToProxies}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>router</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Proxies</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#243647] cursor-pointer hover:bg-[#2f455a] transition-colors">
                <span className="text-white material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_bag</span>
                <p className="text-white text-sm font-medium leading-normal">Đã Mua</p>
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

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors text-[#93adc8] hover:text-red-400" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Log Out</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-4 text-white">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Port Forwards</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadMappings}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#243647] hover:bg-[#344d65] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              Refresh
            </button>
            <button
              onClick={handleStartAll}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
              Start All
            </button>
            <button
              onClick={handleStopAll}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>stop</span>
              Stop All
            </button>
          </div>
        </header>

        <div className="flex flex-col w-full max-w-[1200px] mx-auto p-4 md:p-6 gap-6">
          {error && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-[#93adc8] py-8">Loading port mappings...</div>
          ) : mappings.length === 0 ? (
            <div className="text-center text-[#93adc8] py-8">No port mappings found. Purchase proxies from the website.</div>
          ) : (
            <div className="border border-[#344d65] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#111a22] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Local Port</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Upstream</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Connection String</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Expires At</th>
                    <th className="px-4 py-3 text-center text-[#93adc8] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping) => {
                    const active = isActive(mapping.mappingId);
                    const connectionString = `socks5://localhost:${mapping.localPort}`;
                    return (
                      <tr
                        key={mapping.mappingId}
                        className="border-b border-[#344d65]/50 hover:bg-[#1a2632]/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="text-white font-mono font-semibold">{mapping.localPort}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                              active
                                ? 'bg-green-600/20 text-green-400 border border-green-600'
                                : 'bg-gray-600/20 text-gray-400 border border-gray-600'
                            }`}
                          >
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#93adc8] font-mono text-sm">
                            {mapping.upstreamHost}:{mapping.upstreamPort}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-[#111a22] border border-[#344d65] rounded px-2 py-1 text-xs text-white font-mono truncate max-w-xs">
                              {connectionString}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(connectionString);
                              }}
                              className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors shrink-0"
                              title="Copy connection string"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#93adc8] text-xs">
                            {new Date(mapping.expiresAt).toLocaleString('vi-VN')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {active ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStop(mapping.mappingId);
                                }}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stop</span>
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStart(mapping);
                                }}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>
                                Start
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
