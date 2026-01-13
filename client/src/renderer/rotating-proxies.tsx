import React, { useState, useEffect } from 'react';
import { RotatingProxyPurchaseDialog } from './RotatingProxyPurchaseDialog';
import { RotatingProxyResult } from './RotatingProxyResult';
import { Sidebar } from './Sidebar';
import { useAuthStore } from './stores';

interface RotatingProxy {
  id: string;
  domain: string;
  ip: string;
  port: number | null;
  mappingId: string | null;
  rotationInterval: number | null;
  expiresAt: string;
  duration: string;
  status: string;
}

interface RotatingProxiesProps {
  onLogout: () => void;
}

export const RotatingProxies: React.FC<RotatingProxiesProps> = ({
  onLogout,
}) => {
  // Get state from stores
  const userEmail = useAuthStore((state) => state.userEmail);
  const [proxies, setProxies] = useState<RotatingProxy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'list' | 'guide'>('list');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingPortIndex, setEditingPortIndex] = useState<number | null>(null);
  const [selectedPorts, setSelectedPorts] = useState<Record<number, number>>({});
  const [serverStatuses, setServerStatuses] = useState<Record<string, boolean>>({});
  const [editingRotationIntervalIndex, setEditingRotationIntervalIndex] = useState<number | null>(null);
  const [selectedRotationIntervals, setSelectedRotationIntervals] = useState<Record<number, number>>({});

  const loadProxies = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const data = await window.electronAPI?.payments.getMyRotatingProxies();
      if (data) {
        setProxies(data);
        // Check server statuses
        const statuses: Record<string, boolean> = {};
        for (const proxy of data) {
          if (proxy.port) {
            try {
              statuses[proxy.id] = await window.electronAPI?.rotatingProxy.isServerRunning(proxy.id) || false;
            } catch (err) {
              statuses[proxy.id] = false;
            }
          }
        }
        setServerStatuses(statuses);
      }
    } catch (err: any) {
      console.error('Failed to load rotating proxies:', err);
      setError(err.message || 'Failed to load rotating proxies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProxies();
    
    // Refresh proxies mỗi 10 giây
    const interval = setInterval(() => {
      loadProxies();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleServer = async (proxy: RotatingProxy) => {
    try {
      if (serverStatuses[proxy.id]) {
        await window.electronAPI?.rotatingProxy.stopServer(proxy.id);
      } else {
        if (!proxy.port) {
          alert('Vui lòng chọn port trước khi khởi động server');
          return;
        }
        await window.electronAPI?.rotatingProxy.startServer(proxy.id, proxy.port);
      }
      await loadProxies();
    } catch (err: any) {
      console.error('Failed to toggle server:', err);
      alert(err.message || 'Thao tác thất bại');
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getDurationText = (duration: string): string => {
    switch (duration) {
      case '1d':
        return '1 ngày';
      case '3d':
        return '3 ngày';
      case '7d':
        return '7 ngày';
      case '15d':
        return '15 ngày';
      default:
        return duration;
    }
  };

  const getRotationIntervalText = (interval: number | null): string => {
    if (!interval) return '5 phút';
    return `${interval} phút`;
  };


  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <Sidebar onLogout={onLogout} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-4 text-white">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Proxy Xoay</h2>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Mua Proxy Xoay</span>
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border-2 border-[#243647] bg-gradient-to-br from-primary to-purple-600"></div>
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
            <div className="text-center text-[#93adc8] py-8">Loading rotating proxies...</div>
          ) : proxies.length === 0 ? (
            <div className="text-center text-[#93adc8] py-8">
              <p className="mb-4">Bạn chưa có proxy xoay nào.</p>
              <button
                onClick={() => setShowPurchaseDialog(true)}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Mua Proxy Xoay Ngay
              </button>
            </div>
          ) : (
            <div className="border border-[#344d65] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#111a22] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">IP:Port</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Server</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Xoay IP</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Thời hạn</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Hết hạn</th>
                    <th className="px-4 py-3 text-center text-[#93adc8] font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {proxies.map((proxy, index) => (
                    <tr
                      key={proxy.id}
                      className="border-b border-[#344d65]/50 hover:bg-[#1a2632]/50 transition-colors"
                    >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-sm">
                              {proxy.ip || '127.0.0.1'}:{proxy.port || 'Chưa chọn'}
                            </span>
                            {editingPortIndex === index ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={selectedPorts[index] || proxy.port || 11000}
                                  onChange={(e) => {
                                    setSelectedPorts({
                                      ...selectedPorts,
                                      [index]: parseInt(e.target.value),
                                    });
                                  }}
                                  className="px-2 py-1 bg-[#243647] border border-[#344d65] rounded text-sm text-white"
                                  autoFocus
                                >
                                  {Array.from({ length: 4001 }, (_, i) => 11000 + i).map((port) => (
                                    <option key={port} value={port}>
                                      {port}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={async () => {
                                    const newPort = selectedPorts[index] || proxy.port;
                                    if (newPort && newPort >= 11000 && newPort <= 15000) {
                                      try {
                                        await window.electronAPI?.payments.updateRotatingProxyPort(
                                          proxy.id,
                                          newPort,
                                        );
                                        // Auto-start server after port update
                                        if (newPort) {
                                          try {
                                            await window.electronAPI?.rotatingProxy.startServer(proxy.id, newPort);
                                          } catch (serverErr: any) {
                                            console.warn('Failed to auto-start server:', serverErr);
                                            // Don't fail the whole operation if server start fails
                                          }
                                        }
                                        setEditingPortIndex(null);
                                        loadProxies();
                                      } catch (err: any) {
                                        console.error('Failed to update port:', err);
                                        alert(err.message || 'Cập nhật port thất bại');
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 bg-primary hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                >
                                  Lưu
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPortIndex(null);
                                    setSelectedPorts({ ...selectedPorts, [index]: proxy.port || undefined });
                                  }}
                                  className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPortIndex(index);
                                  setSelectedPorts({ ...selectedPorts, [index]: proxy.port || 11000 });
                                }}
                                className="text-xs text-primary hover:text-blue-400 transition-colors"
                              >
                                Chọn port
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {proxy.port ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                                  serverStatuses[proxy.id]
                                    ? 'bg-green-600/20 text-green-400 border border-green-600'
                                    : 'bg-gray-600/20 text-gray-400 border border-gray-600'
                                }`}
                              >
                                {serverStatuses[proxy.id] ? 'Đang chạy' : 'Đã dừng'}
                              </span>
                              <button
                                onClick={() => toggleServer(proxy)}
                                className={`flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                  serverStatuses[proxy.id]
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-primary hover:bg-blue-600 text-white'
                                }`}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                  {serverStatuses[proxy.id] ? 'stop' : 'play_arrow'}
                                </span>
                                {serverStatuses[proxy.id] ? 'Dừng' : 'Khởi động'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#93adc8]">Chưa chọn port</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingRotationIntervalIndex === index ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedRotationIntervals[index] || proxy.rotationInterval || 5}
                                onChange={(e) => {
                                  setSelectedRotationIntervals({
                                    ...selectedRotationIntervals,
                                    [index]: parseInt(e.target.value),
                                  });
                                }}
                                className="px-2 py-1 bg-[#243647] border border-[#344d65] rounded text-sm text-white"
                                autoFocus
                              >
                                <option value={1}>1 phút</option>
                                <option value={2}>2 phút</option>
                                <option value={5}>5 phút</option>
                              </select>
                              <button
                                onClick={async () => {
                                  const newInterval = selectedRotationIntervals[index] || proxy.rotationInterval || 5;
                                  if ([1, 2, 5].includes(newInterval)) {
                                    try {
                                      await window.electronAPI?.payments.updateRotatingProxyRotationInterval(
                                        proxy.id,
                                        newInterval,
                                      );
                                      setEditingRotationIntervalIndex(null);
                                      loadProxies();
                                    } catch (err: any) {
                                      console.error('Failed to update rotation interval:', err);
                                      alert(err.message || 'Cập nhật interval thất bại');
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-primary hover:bg-blue-600 text-white text-xs rounded transition-colors"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRotationIntervalIndex(null);
                                  setSelectedRotationIntervals({ ...selectedRotationIntervals, [index]: proxy.rotationInterval || undefined });
                                }}
                                className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[#93adc8] text-sm">{getRotationIntervalText(proxy.rotationInterval)}</span>
                              <button
                                onClick={() => {
                                  setEditingRotationIntervalIndex(index);
                                  setSelectedRotationIntervals({ ...selectedRotationIntervals, [index]: proxy.rotationInterval || 5 });
                                }}
                                className="text-xs text-primary hover:text-blue-400 transition-colors"
                              >
                                Sửa
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#93adc8] text-sm">{getDurationText(proxy.duration)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium inline-block ${
                              proxy.status === 'active'
                                ? 'bg-green-600/20 text-green-400 border border-green-600'
                                : proxy.status === 'expired'
                                ? 'bg-red-600/20 text-red-400 border border-red-600'
                                : 'bg-gray-600/20 text-gray-400 border border-gray-600'
                            }`}
                          >
                            {proxy.status === 'active' ? 'Active' : proxy.status === 'expired' ? 'Expired' : proxy.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#93adc8] text-xs">
                            {formatDate(proxy.expiresAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => copyToClipboard(`${proxy.ip || '127.0.0.1'}:${proxy.port || ''}`, index)}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#243647] hover:bg-[#344d65] text-white text-xs font-medium rounded transition-colors"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                {copiedIndex === index ? 'check' : 'content_copy'}
                              </span>
                              {copiedIndex === index ? 'Đã copy!' : 'Copy'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
            </>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Hướng dẫn Proxy Xoay */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>info</span>
                  <h3 className="text-white text-lg font-bold">Proxy Xoay là gì?</h3>
                </div>
                <div className="space-y-4 text-[#93adc8] text-sm">
                  <p>
                    Proxy Xoay là dịch vụ proxy tự động thay đổi IP theo chu kỳ (1, 2 hoặc 5 phút). 
                    Mỗi proxy có một <strong className="text-white">Domain</strong> và <strong className="text-white">API Key</strong> riêng.
                  </p>
                  <div>
                    <p className="text-white font-medium mb-2">Đặc điểm:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>IP tự động thay đổi theo chu kỳ đã cấu hình</li>
                      <li>Không cần chọn IP cụ thể, hệ thống tự động xoay</li>
                      <li>Sử dụng Domain và API Key để kết nối</li>
                      <li>Phù hợp cho các tác vụ cần IP thay đổi thường xuyên</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn Cấu hình */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>settings</span>
                  <h3 className="text-white text-lg font-bold">Cấu hình Proxy Xoay</h3>
                </div>
                <div className="space-y-4 text-[#93adc8] text-sm">
                  <div>
                    <p className="text-white font-medium mb-2">1. Chọn Port và Khởi động Server:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Trong bảng danh sách, click <strong className="text-white">"Chọn port"</strong> để chọn port từ 11000-15000</li>
                      <li>Click <strong className="text-green-400">"Khởi động"</strong> để bắt đầu server proxy</li>
                      <li>Đảm bảo trạng thái server là <strong className="text-green-400">"Đang chạy"</strong></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">2. Cấu hình chu kỳ xoay IP:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Click <strong className="text-white">"Sửa"</strong> ở cột "Xoay IP"</li>
                      <li>Chọn chu kỳ: <strong className="text-white">1 phút</strong>, <strong className="text-white">2 phút</strong>, hoặc <strong className="text-white">5 phút</strong></li>
                      <li>IP sẽ tự động thay đổi theo chu kỳ đã chọn</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">3. Thông tin kết nối:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong className="text-white">Host:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">127.0.0.1</code></li>
                      <li><strong className="text-white">Port:</strong> <code className="bg-[#243647] px-2 py-1 rounded text-xs">[Port đã chọn từ 11000-15000]</code></li>
                      <li><strong className="text-white">Type:</strong> SOCKS5</li>
                      <li><strong className="text-white">Authentication:</strong> Không cần (proxy local)</li>
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
                      <div className="text-[#93adc8] mt-3 text-xs">Ví dụ: curl --socks5-hostname 127.0.0.1:11000 https://api.ipify.org</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-2">Kiểm tra kết nối chi tiết:</p>
                    <div className="bg-[#243647] border border-[#344d65] rounded-lg p-4 font-mono text-xs">
                      <div className="text-white mb-2"># Test với verbose mode</div>
                      <div className="text-primary">curl -v --socks5-hostname 127.0.0.1:[PORT] https://httpbin.org/ip</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg">
                    <p className="text-blue-400 text-xs">
                      <strong>Lưu ý:</strong> Thay <code className="bg-[#243647] px-1 py-0.5 rounded">[PORT]</code> bằng port đã chọn (11000-15000). 
                      Đảm bảo server đang ở trạng thái <strong className="text-green-400">"Đang chạy"</strong> trước khi test.
                      IP sẽ tự động thay đổi theo chu kỳ đã cấu hình.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lưu ý quan trọng */}
              <div className="border border-[#344d65] rounded-lg bg-[#111a22] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '24px' }}>warning</span>
                  <h3 className="text-white text-lg font-bold">Lưu ý quan trọng</h3>
                </div>
                <div className="space-y-2 text-[#93adc8] text-sm">
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Đảm bảo server proxy đang ở trạng thái <strong className="text-green-400">"Đang chạy"</strong> trước khi sử dụng</li>
                    <li>IP sẽ tự động thay đổi theo chu kỳ (1, 2 hoặc 5 phút) - không cần can thiệp thủ công</li>
                    <li>Mỗi proxy có Domain và API Key riêng - lưu lại cẩn thận khi mua</li>
                    <li>Port phải nằm trong khoảng 11000-15000</li>
                    <li>Không cần nhập Username và Password cho proxy local (127.0.0.1)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <RotatingProxyPurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        onSuccess={() => {
          setShowPurchaseDialog(false);
          loadProxies();
        }}
        onClose={() => setShowPurchaseDialog(false)}
      />
    </div>
  );
};
