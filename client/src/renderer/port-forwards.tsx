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
  onNavigateToPaymentHistory: () => void;
  onNavigateToSettings: () => void;
}

export const PortForwards: React.FC<PortForwardsProps> = ({
  userEmail,
  onLogout,
  onNavigateToDashboard,
  onNavigateToProxies,
  onNavigateToPaymentHistory,
}) => {
  const [mappings, setMappings] = useState<PortMapping[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'list' | 'guide'>('list');

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
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPaymentHistory}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>receipt_long</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Lịch sử thanh toán</p>
              </div>
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={() => onNavigateToSettings?.()}
              >
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
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#344d65]">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'list'
                  ? 'text-white border-b-2 border-primary'
                  : 'text-[#93adc8] hover:text-white'
              }`}
            >
              Danh sách
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'text-white border-b-2 border-primary'
                  : 'text-[#93adc8] hover:text-white'
              }`}
            >
              Hướng dẫn
            </button>
          </div>

          {error && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'list' ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Hướng dẫn WiFi */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>wifi</span>
                  <h3 className="text-white text-lg font-bold">Thiết lập WiFi</h3>
                </div>
                <div className="space-y-4 text-[#93adc8] text-sm">
                  <div>
                    <p className="text-white font-medium mb-2">1. Cấu hình Proxy trên máy tính:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Vào <strong className="text-white">System Preferences</strong> (macOS) hoặc <strong className="text-white">Settings</strong> (Windows/Linux)</li>
                      <li>Tìm mục <strong className="text-white">Network</strong> hoặc <strong className="text-white">Proxy Settings</strong></li>
                      <li>Chọn <strong className="text-white">Manual proxy configuration</strong></li>
                      <li>Điền thông tin:
                        <ul className="list-circle list-inside ml-4 mt-1 space-y-1">
                          <li><strong className="text-white">Type:</strong> SOCKS5</li>
                          <li><strong className="text-white">Host:</strong> localhost</li>
                          <li><strong className="text-white">Port:</strong> [Local Port từ bảng danh sách]</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">2. Lưu ý:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Đảm bảo Port Forward đang ở trạng thái <strong className="text-green-400">Active</strong></li>
                      <li>Không cần nhập Username và Password cho proxy local</li>
                      <li>Tất cả traffic qua WiFi sẽ được định tuyến qua proxy</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn Browser */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>language</span>
                  <h3 className="text-white text-lg font-bold">Thiết lập Browser</h3>
                </div>
                <div className="space-y-4 text-[#93adc8] text-sm">
                  <div>
                    <p className="text-white font-medium mb-2">Chrome / Edge:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Cài đặt extension: <strong className="text-white">SwitchyOmega</strong> hoặc <strong className="text-white">FoxyProxy</strong></li>
                      <li>Cấu hình SOCKS5 proxy: <code className="bg-[#243647] px-2 py-1 rounded text-xs">localhost:[PORT]</code></li>
                      <li>Chọn profile proxy vừa tạo khi cần sử dụng</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Firefox:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Vào <strong className="text-white">Settings</strong> → <strong className="text-white">Network Settings</strong></li>
                      <li>Chọn <strong className="text-white">Manual proxy configuration</strong></li>
                      <li>Điền <strong className="text-white">SOCKS Host:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">localhost</code></li>
                      <li>Điền <strong className="text-white">Port:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">[PORT]</code></li>
                      <li>Chọn <strong className="text-white">SOCKS v5</strong></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Safari:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Vào <strong className="text-white">System Preferences</strong> → <strong className="text-white">Network</strong></li>
                      <li>Chọn kết nối mạng → <strong className="text-white">Advanced</strong> → <strong className="text-white">Proxies</strong></li>
                      <li>Chọn <strong className="text-white">SOCKS Proxy</strong></li>
                      <li>Điền <code className="bg-[#243647] px-2 py-1 rounded text-xs">localhost:[PORT]</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn Test nhanh */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>terminal</span>
                  <h3 className="text-white text-lg font-bold">Test nhanh bằng lệnh curl</h3>
                </div>
                <div className="space-y-4 text-[#93adc8] text-sm">
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra IP hiện tại:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-white mb-2"># Test với localhost và port (không cần auth)</div>
                      <div className="text-primary">curl --socks5-hostname localhost:[PORT] https://api.ipify.org</div>
                      <div className="text-[#93adc8] mt-3 text-xs">Ví dụ: curl --socks5-hostname localhost:1080 https://api.ipify.org</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra kết nối chi tiết:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-white mb-2"># Test với verbose mode</div>
                      <div className="text-primary">curl -v --socks5-hostname localhost:[PORT] https://httpbin.org/ip</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra tốc độ:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-primary">
                        {`curl --socks5-hostname localhost:[PORT] -o /dev/null -s -w "Time: %{time_total}s\\n" https://www.google.com`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg">
                    <p className="text-blue-400 text-xs">
                      <strong>Lưu ý:</strong> Thay <code className="bg-[#243647] px-1 py-0.5 rounded">[PORT]</code> bằng Local Port từ bảng danh sách. 
                      Đảm bảo Port Forward đang ở trạng thái <strong className="text-green-400">Active</strong> trước khi test.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
