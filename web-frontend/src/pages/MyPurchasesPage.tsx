import React, { useEffect, useState } from 'react';
import { rotatingProxiesService, RotatingProxyPurchase, RotationInterval } from '../services/rotating-proxies';
import { formatDate, formatRotationInterval, formatRotatingProxyConnection } from '../utils/format';
import * as Dialog from '@radix-ui/react-dialog';

export const MyPurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<RotatingProxyPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<RotatingProxyPurchase | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const data = await rotatingProxiesService.getMyPurchases();
      setPurchases(data);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(id);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleViewDetails = (purchase: RotatingProxyPurchase) => {
    setSelectedPurchase(purchase);
    setShowDetailsDialog(true);
  };

  const toggleApiKeyVisibility = (purchaseId: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [purchaseId]: !prev[purchaseId],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
            Đang hoạt động
          </span>
        );
      case 'expired':
        return (
          <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
            Hết hạn
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
            {status}
          </span>
        );
    }
  };

  const getDurationText = (duration: string) => {
    switch (duration) {
      case '24h':
        return '24 giờ';
      case '7d':
        return '7 ngày';
      case '30d':
        return '30 ngày';
      default:
        return duration;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Proxy Xoay của tôi
        </h1>
        <p className="text-gray-400">
          Quản lý và xem lại các proxy xoay đã mua.
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-gray-400 mb-4">Bạn chưa mua proxy xoay nào.</p>
          <a
            href="/"
            className="text-blue-500 hover:text-blue-400 font-medium"
          >
            Mua proxy xoay ngay →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const connectionString = formatRotatingProxyConnection(purchase.domain, purchase.apiKey);
            const isApiKeyVisible = showApiKey[purchase.id] || false;

            return (
              <div
                key={purchase.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        Gói {formatRotationInterval(purchase.rotationInterval)}
                      </h3>
                      {getStatusBadge(purchase.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Domain:</span>
                        <span className="text-white font-mono ml-2 break-all">
                          {purchase.domain}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Rotation:</span>
                        <span className="text-white ml-2">
                          {formatRotationInterval(purchase.rotationInterval)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Thời hạn:</span>
                        <span className="text-white ml-2">
                          {getDurationText(purchase.duration)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Hết hạn:</span>
                        <span className="text-white ml-2">
                          {formatDate(purchase.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Key Section */}
                <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">API Key:</span>
                    <button
                      onClick={() => toggleApiKeyVisibility(purchase.id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {isApiKeyVisible ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  {isApiKeyVisible ? (
                    <code className="text-sm text-white font-mono break-all">
                      {purchase.apiKey}
                    </code>
                  ) : (
                    <code className="text-sm text-gray-500 font-mono">
                      ••••••••••••••••••••••••••••••••
                    </code>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleViewDetails(purchase)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => copyToClipboard(purchase.domain, `domain-${purchase.id}`)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `domain-${purchase.id}` ? 'Đã copy!' : 'Copy Domain'}
                  </button>
                  {isApiKeyVisible && (
                    <button
                      onClick={() => copyToClipboard(purchase.apiKey, `apikey-${purchase.id}`)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {copiedField === `apikey-${purchase.id}` ? 'Đã copy!' : 'Copy API Key'}
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(connectionString, `connection-${purchase.id}`)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `connection-${purchase.id}` ? 'Đã copy!' : 'Copy Connection'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      {selectedPurchase && (
        <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <Dialog.Title className="text-2xl font-bold text-white mb-4">
                Chi tiết Proxy Xoay
              </Dialog.Title>

              <Dialog.Close asChild>
                <button
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </Dialog.Close>

              <div className="space-y-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Thông tin gói</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rotation Interval:</span>
                      <span className="text-white font-semibold">
                        {formatRotationInterval(selectedPurchase.rotationInterval)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Thời hạn:</span>
                      <span className="text-white">{getDurationText(selectedPurchase.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      {getStatusBadge(selectedPurchase.status)}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Domain</h3>
                  <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
                    <code className="text-sm text-gray-300 break-all">{selectedPurchase.domain}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedPurchase.domain, `detail-domain-${selectedPurchase.id}`)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `detail-domain-${selectedPurchase.id}` ? 'Đã copy!' : 'Copy Domain'}
                  </button>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">API Key</h3>
                  <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
                    <code className="text-sm text-white font-mono break-all">
                      {selectedPurchase.apiKey}
                    </code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedPurchase.apiKey, `detail-apikey-${selectedPurchase.id}`)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `detail-apikey-${selectedPurchase.id}` ? 'Đã copy!' : 'Copy API Key'}
                  </button>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Connection String</h3>
                  <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
                    <code className="text-sm text-gray-300 break-all">
                      {formatRotatingProxyConnection(selectedPurchase.domain, selectedPurchase.apiKey)}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      const connectionString = formatRotatingProxyConnection(
                        selectedPurchase.domain,
                        selectedPurchase.apiKey,
                      );
                      copyToClipboard(connectionString, `detail-connection-${selectedPurchase.id}`);
                    }}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {copiedField === `detail-connection-${selectedPurchase.id}` ? 'Đã copy!' : 'Copy Connection String'}
                  </button>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Thông tin khác</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mua lúc:</span>
                      <span className="text-white">{formatDate(selectedPurchase.purchasedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hết hạn:</span>
                      <span className="text-white">{formatDate(selectedPurchase.expiresAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Giá:</span>
                      <span className="text-white">${selectedPurchase.price}</span>
                    </div>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
                    Đóng
                  </button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
};
