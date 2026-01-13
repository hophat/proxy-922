import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RotatingProxyPurchaseDialog } from '../components/RotatingProxyPurchaseDialog';
import { rotatingProxiesService, RotatingProxyResponse } from '../services/rotating-proxies';
import { PurchaseDuration } from '../services/purchases';
import { formatDate } from '../utils/format';

export const RotatingProxiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [proxies, setProxies] = useState<RotatingProxyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [editingPortIndex, setEditingPortIndex] = useState<number | null>(null);
  const [selectedPorts, setSelectedPorts] = useState<Record<number, number>>({});

  useEffect(() => {
    loadProxies();
  }, []);

  const loadProxies = async () => {
    try {
      setLoading(true);
      const data = await rotatingProxiesService.getMyRotatingProxies();
      setProxies(data);
    } catch (err) {
      console.error('Failed to load rotating proxies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    loadProxies();
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleRevealKey = (index: number) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedKeys(newRevealed);
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const getDurationText = (duration: PurchaseDuration): string => {
    switch (duration) {
      case PurchaseDuration.DAYS_1:
        return '1 ngày';
      case PurchaseDuration.DAYS_3:
        return '3 ngày';
      case PurchaseDuration.DAYS_7:
        return '7 ngày';
      case PurchaseDuration.DAYS_15:
        return '15 ngày';
      default:
        return duration;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
            Active
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-500/20 text-gray-400">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-gray-400">Đang tải...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Proxy Xoay</h1>
            <p className="text-gray-400">
              Quản lý các proxy xoay đã mua. Mỗi proxy có domain và API key riêng.
            </p>
          </div>
          <button
            onClick={() => setShowPurchaseDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            + Mua Proxy Xoay
          </button>
        </div>

        {proxies.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-4">Bạn chưa có proxy xoay nào.</p>
            <button
              onClick={() => setShowPurchaseDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Mua Proxy Xoay Ngay
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      IP:Port
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thông tin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thời hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Hết hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {proxies.map((proxy, index) => (
                    <tr key={proxy.id} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-gray-300 font-mono">
                            {proxy.ip || '127.0.0.1'}:{proxy.port || 'Chưa chọn'}
                          </code>
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
                                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
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
                                      await rotatingProxiesService.updatePort(proxy.id, newPort);
                                      setEditingPortIndex(null);
                                      loadProxies();
                                    } catch (err: any) {
                                      console.error('Failed to update port:', err);
                                      alert(err.message || 'Cập nhật port thất bại');
                                    }
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPortIndex(null);
                                  setSelectedPorts({ ...selectedPorts, [index]: proxy.port || undefined });
                                }}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
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
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Chọn port
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {proxy.ip && proxy.port ? (
                            <span>Sử dụng client app để khởi động server trên IP:Port này</span>
                          ) : (
                            <span className="text-gray-500">Chưa có IP:Port</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {getDurationText(proxy.duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(proxy.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(proxy.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {proxy.ip && proxy.port ? (
                          <button
                            onClick={() => copyToClipboard(`${proxy.ip}:${proxy.port}`, index)}
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            {copiedIndex === index ? 'Đã copy!' : 'Copy IP:Port'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">Chưa có port</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <RotatingProxyPurchaseDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          onSuccess={handlePurchaseSuccess}
          onClose={() => setShowPurchaseDialog(false)}
        />
      </div>
    </Layout>
  );
};
