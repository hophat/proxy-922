import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuthStore } from './stores';

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
  onLogout: () => void;
  refreshTrigger?: number; // Optional: trigger refresh when this changes
}

export const PortForwards: React.FC<PortForwardsProps> = ({
  onLogout,
  refreshTrigger,
}) => {
  // Get state from stores
  const userEmail = useAuthStore((state) => state.userEmail);
  const [mappings, setMappings] = useState<PortMapping[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true); // Chỉ hiển thị loading khi lần đầu
  const [refreshing, setRefreshing] = useState(false); // Loading indicator nhỏ khi refresh
  const [error, setError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'list' | 'guide'>('list');
  const [showChangePortDialog, setShowChangePortDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<PortMapping | null>(null);
  const [changingPort, setChangingPort] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<Array<{ port: number; gatewayId: string; gatewayIp: string; portId: string }>>([]);
  const [loadingAvailablePorts, setLoadingAvailablePorts] = useState(false);
  const [revealedUpstreams, setRevealedUpstreams] = useState<Set<string>>(new Set());

  const loadMappings = async (isInitialLoad: boolean = false) => {
    try {
      // Chỉ set initialLoading khi lần đầu load, còn lại chỉ set refreshing
      if (isInitialLoad) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(undefined);
      
      if (!window.electronAPI?.portForward) {
        throw new Error('Electron API not available');
      }
      
      const data = await window.electronAPI.portForward.refresh();
      if (data && Array.isArray(data)) {
        setMappings(data);
      } else {
        // Chỉ set empty array khi lần đầu load, giữ nguyên danh sách cũ khi refresh
        if (isInitialLoad) {
          setMappings([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load mappings:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to load port mappings';
      setError(errorMessage);
      // Chỉ set empty array khi lần đầu load, giữ nguyên danh sách cũ khi refresh
      if (isInitialLoad) {
        setMappings([]);
      }
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const loadActivePortForwards = async () => {
    try {
      if (!window.electronAPI?.portForward) {
        return;
      }
      const ids = await window.electronAPI.portForward.list();
      if (ids && Array.isArray(ids)) {
        setActiveIds(new Set(ids));
      } else {
        setActiveIds(new Set());
      }
    } catch (err) {
      console.error('Failed to load active port forwards:', err);
      setActiveIds(new Set());
    }
  };

  const loadAvailablePorts = async () => {
    try {
      setLoadingAvailablePorts(true);
      if (!window.electronAPI?.portForward) {
        return;
      }
      const ports = await window.electronAPI.portForward.getAvailablePorts();
      if (ports && Array.isArray(ports)) {
        setAvailablePorts(ports);
      } else {
        setAvailablePorts([]);
      }
    } catch (err: any) {
      console.error('Failed to load available ports:', err);
      setAvailablePorts([]);
    } finally {
      setLoadingAvailablePorts(false);
    }
  };

  useEffect(() => {
    // Load data khi component mount hoặc khi navigate đến page này
    loadMappings(true); // Lần đầu load với initialLoading = true
    loadActivePortForwards();
    loadAvailablePorts();
    
    // Refresh mappings mỗi 5 giây để cập nhật sau khi mua (không hiển thị loading toàn màn hình)
    const mappingsInterval = setInterval(() => {
      loadMappings(false); // Refresh tự động không set initialLoading
    }, 5000);
    
    // Refresh active status mỗi 2 giây
    const activeInterval = setInterval(() => {
      loadActivePortForwards();
    }, 2000);
    
    return () => {
      clearInterval(mappingsInterval);
      clearInterval(activeInterval);
    };
  }, []);

  // Refresh khi có trigger (ví dụ: sau khi mua thành công)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadMappings(false); // Refresh với refreshing indicator nhỏ
      loadAvailablePorts();
    }
  }, [refreshTrigger]);

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

  const handleOpenChangePort = async (mapping: PortMapping) => {
    try {
      setSelectedMapping(mapping);
      setShowChangePortDialog(true);
      // Không cần load available ports nữa - hiển thị tất cả port từ 3000-10000
    } catch (err: any) {
      console.error('Failed to open change port dialog:', err);
      setError(err.message || 'Failed to open change port dialog');
    }
  };

  const handleChangePort = async (newPort: number) => {
    if (!selectedMapping) return;

    try {
      setChangingPort(true);
      setError(undefined);
      await window.electronAPI?.portForward.changePort(
        selectedMapping.mappingId,
        newPort,
      );
      setShowChangePortDialog(false);
      setSelectedMapping(null);
      // Reload mappings để lấy thông tin port mới
      await loadMappings(false);
      await loadActivePortForwards();
      
      // Tự động start port forward với mapping mới
      const updatedMappings = await window.electronAPI?.portForward.refresh();
      if (updatedMappings) {
        const updatedMapping = updatedMappings.find((m: PortMapping) => m.mappingId === selectedMapping.mappingId);
        if (updatedMapping) {
          try {
            await handleStart(updatedMapping);
          } catch (startErr: any) {
            console.log('Auto-start port forward failed (non-critical):', startErr);
            // Không throw error vì đổi port đã thành công, chỉ là auto-start thất bại
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to change port:', err);
      const errorMessage = err.message || 'Failed to change port';
      
      // Hiển thị alert cho lỗi cooldown
      if (errorMessage.includes('đợi') && errorMessage.includes('phút')) {
        alert(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setChangingPort(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isActive = (mappingId: string) => activeIds.has(mappingId);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <Sidebar onLogout={onLogout} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-10 flex flex-col gap-2 whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">IP tĩnh</h2>
              <p className="text-[#93adc8] text-xs">Là IP tĩnh, chuyên cho việc nuôi acc lâu dài, sống từ 1 → 2 tháng</p>
            </div>
            <div className="flex items-center gap-3">
            <button
              onClick={() => loadMappings(false)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#243647] hover:bg-[#344d65] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span 
                className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`} 
                style={{ fontSize: '18px' }}
              >
                refresh
              </span>
              {refreshing ? 'Refreshing...' : 'Refresh'}
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
              {initialLoading ? (
                <div className="text-center text-[#93adc8] py-8">Loading port mappings...</div>
              ) : mappings.length === 0 ? (
                <div className="text-center text-[#93adc8] py-8">No port mappings found. Purchase proxies from the website.</div>
              ) : (
                <div className="border border-[#344d65] rounded-lg overflow-hidden relative">
                  {/* Loading indicator nhỏ ở góc trên bên phải khi đang refresh */}
                  {refreshing && (
                    <div className="absolute top-2 right-2 z-10 bg-[#243647] px-3 py-1 rounded-lg flex items-center gap-2 text-xs text-[#93adc8]">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>
                        refresh
                      </span>
                      Refreshing...
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead className="bg-[#111a22] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Port</th>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Gateway IP</th>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">IP</th>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Upstream/SOCKS5</th>
                        <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Expires At</th>
                        <th className="px-4 py-3 text-center text-[#93adc8] font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((mapping) => {
                        const active = isActive(mapping.mappingId);
                        const isUpstreamRevealed = revealedUpstreams.has(mapping.mappingId);
                        const upstreamDisplay = isUpstreamRevealed 
                          ? `${mapping.upstreamHost}:${mapping.upstreamPort}`
                          : '****';
                        
                        return (
                          <tr
                            id={`port-${mapping.mappingId}`}
                            key={mapping.mappingId}
                            className="border-b border-[#344d65]/50 hover:bg-[#1a2632]/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span className="text-white font-mono font-semibold">{mapping.localPort}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[#93adc8] font-mono text-sm">
                                {mapping.gatewayIp}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-white font-mono text-sm">
                                {mapping.upstreamHost}
                              </span>
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
                              <div className="flex items-center gap-2">
                                <span className="text-[#93adc8] font-mono text-sm">
                                  {upstreamDisplay}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newRevealed = new Set(revealedUpstreams);
                                    if (isUpstreamRevealed) {
                                      newRevealed.delete(mapping.mappingId);
                                    } else {
                                      newRevealed.add(mapping.mappingId);
                                    }
                                    setRevealedUpstreams(newRevealed);
                                  }}
                                  className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors shrink-0"
                                  title={isUpstreamRevealed ? "Ẩn IP" : "Hiện IP"}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                    {isUpstreamRevealed ? 'visibility_off' : 'visibility'}
                                  </span>
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
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenChangePort(mapping);
                                  }}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#243647] hover:bg-[#344d65] text-white text-xs font-medium rounded transition-colors"
                                  title="Đổi Port"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>swap_horiz</span>
                                  Đổi Port
                                </button>
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
                          <li><strong className="text-white">Host:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">127.0.0.1</code></li>
                          <li><strong className="text-white">Port:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">[Local Port từ bảng danh sách]</code></li>
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
                      <li>Cấu hình SOCKS5 proxy: <code className="bg-[#243647] px-2 py-1 rounded text-xs">127.0.0.1:[PORT]</code></li>
                      <li>Chọn profile proxy vừa tạo khi cần sử dụng</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Firefox:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Vào <strong className="text-white">Settings</strong> → <strong className="text-white">Network Settings</strong></li>
                      <li>Chọn <strong className="text-white">Manual proxy configuration</strong></li>
                      <li>Điền <strong className="text-white">SOCKS Host:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">127.0.0.1</code></li>
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
                      <li>Điền <code className="bg-[#243647] px-2 py-1 rounded text-xs">127.0.0.1:[PORT]</code></li>
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
                      <div className="text-white mb-2"># Test với 127.0.0.1 và port (không cần auth)</div>
                      <div className="text-primary">curl --socks5-hostname 127.0.0.1:[PORT] https://api.ipify.org</div>
                      <div className="text-[#93adc8] mt-3 text-xs">Ví dụ: curl --socks5-hostname 127.0.0.1:1080 https://api.ipify.org</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra kết nối chi tiết:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-white mb-2"># Test với verbose mode</div>
                      <div className="text-primary">curl -v --socks5-hostname 127.0.0.1:[PORT] https://httpbin.org/ip</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra tốc độ:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-primary">
                        {`curl --socks5-hostname 127.0.0.1:[PORT] -o /dev/null -s -w "Time: %{time_total}s\\n" https://www.google.com`}
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

      {/* Change Port Dialog */}
      {showChangePortDialog && selectedMapping && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-[#111a22] border border-[#344d65] rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Đổi Port</h3>
              <button
                onClick={() => {
                  setShowChangePortDialog(false);
                  setSelectedMapping(null);
                }}
                className="text-[#93adc8] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-[#93adc8] text-sm mb-2">
                Port hiện tại: <span className="text-white font-mono">{selectedMapping.localPort}</span>
              </p>
              <p className="text-[#93adc8] text-sm mb-4">
                Gateway: <span className="text-white font-mono">{selectedMapping.gatewayIp}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-[#93adc8]">
                Chọn Port mới (4000-10000) trong gateway hiện tại:
              </label>
              <div className="bg-[#1a2632] border border-[#344d65] rounded-lg p-3 max-h-60 overflow-y-auto">
                {(() => {
                  // Tạo danh sách port từ 4000-10000, loại bỏ port hiện tại
                  const allPorts = Array.from({ length: 10000 - 4000 + 1 }, (_, i) => 4000 + i)
                    .filter((port) => port !== selectedMapping.localPort);
                  
                  if (allPorts.length === 0) {
                    return (
                      <div className="text-center text-[#93adc8] py-4 text-sm">
                        Không có port nào khả dụng.
                      </div>
                    );
                  }
                  
                  return (
                    <div className="grid grid-cols-8 gap-2">
                      {allPorts.map((port) => (
                        <button
                          key={port}
                          onClick={() => handleChangePort(port)}
                          disabled={changingPort}
                          className="px-2 py-1.5 rounded text-xs font-mono bg-[#243647] hover:bg-primary hover:text-white text-[#93adc8] transition-colors border border-transparent hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={`Chọn port ${port}`}
                        >
                          {port}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChangePortDialog(false);
                  setSelectedMapping(null);
                }}
                className="flex-1 px-4 py-2 bg-[#243647] hover:bg-[#344d65] text-white text-sm font-medium rounded-lg transition-colors"
                disabled={changingPort}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
