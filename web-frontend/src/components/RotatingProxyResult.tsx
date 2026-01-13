import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PaymentOrderResponse } from '../services/rotating-proxies';
import { RotatingProxyResponse } from '../services/rotating-proxies';
import { PurchaseDuration } from '../services/purchases';
import { rotatingProxiesService } from '../services/rotating-proxies';
import { formatDate } from '../utils/format';

interface RotatingProxyResultProps {
  order: PaymentOrderResponse;
  proxyCount: number;
  duration: PurchaseDuration;
  onClose: () => void;
  onSuccess: () => void;
}

export const RotatingProxyResult: React.FC<RotatingProxyResultProps> = ({
  order,
  proxyCount,
  duration,
  onClose,
  onSuccess,
}) => {
  const [proxies, setProxies] = useState<RotatingProxyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [domain, setDomain] = useState<string>('');

  useEffect(() => {
    if (order.status === 'paid') {
      loadProxies();
    } else {
      // Poll for payment status
      const interval = setInterval(async () => {
        try {
          // Re-fetch order status (you may need to add this API)
          const proxies = await rotatingProxiesService.getMyRotatingProxies();
          if (proxies.length > 0) {
            setProxies(proxies);
            if (proxies[0]) {
              setDomain(proxies[0].domain);
            }
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Failed to check proxies:', err);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [order.status]);

  const loadProxies = async () => {
    try {
      const proxies = await rotatingProxiesService.getMyRotatingProxies();
      setProxies(proxies);
      if (proxies[0]) {
        setDomain(proxies[0].domain);
      }
    } catch (err) {
      console.error('Failed to load proxies:', err);
    } finally {
      setLoading(false);
    }
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

  if (order.status !== 'paid') {
    return (
      <Dialog.Root open={true} onOpenChange={() => {}}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl p-6">
            <Dialog.Title className="text-2xl font-bold text-white mb-4">
              Đang chờ thanh toán
            </Dialog.Title>
            <div className="space-y-4">
              <p className="text-gray-300">
                Mã đơn hàng: <strong>{order.orderCode}</strong>
              </p>
              <p className="text-gray-300">
                Số tiền: <strong>{order.amount.toLocaleString('vi-VN')} VNĐ</strong>
              </p>
              {order.qrCodeUrl && (
                <div className="text-center">
                  <img src={order.qrCodeUrl} alt="QR Code" className="mx-auto max-w-xs" />
                </div>
              )}
              {order.vaNumber && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Số tài khoản:</p>
                  <p className="text-lg font-mono text-white">{order.vaNumber}</p>
                </div>
              )}
              <p className="text-sm text-gray-400">
                Vui lòng thanh toán và đợi hệ thống xác nhận. Trang này sẽ tự động cập nhật khi
                thanh toán thành công.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  if (loading) {
    return (
      <Dialog.Root open={true} onOpenChange={() => {}}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl p-6">
            <div className="text-center">
              <div className="text-lg text-gray-400 mb-4">Đang tải thông tin proxy...</div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={true} onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <Dialog.Title className="text-2xl font-bold text-white mb-4">
            Mua Proxy Xoay Thành Công!
          </Dialog.Title>

          <div className="space-y-6">
            {/* Order Info */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Thông tin đơn hàng</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mã đơn hàng:</span>
                  <span className="text-white font-semibold">{order.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Số lượng proxy:</span>
                  <span className="text-white">{proxyCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Thời hạn:</span>
                  <span className="text-white">{getDurationText(duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tổng tiền:</span>
                  <span className="text-white font-semibold">
                    {order.amount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>
            </div>

            {/* Domain */}
            {domain && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Domain</h3>
                <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
                  <code className="text-sm text-gray-300 break-all">{domain}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(domain, -1)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  {copiedIndex === -1 ? 'Đã copy!' : 'Copy Domain'}
                </button>
              </div>
            )}

            {/* API Keys */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                API Keys ({proxies.length} keys)
              </h3>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-400">
                  ⚠️ Lưu ý: Mỗi proxy có 1 API key riêng. Vui lòng lưu lại cẩn thận.
                </p>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {proxies.map((proxy, index) => (
                  <div key={proxy.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Proxy #{index + 1}</span>
                      <span className="text-xs text-gray-500">
                        Hết hạn: {formatDate(proxy.expiresAt)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">IP:Port</div>
                      <div className="bg-gray-900 rounded px-3 py-2 mb-2">
                        <code className="text-sm text-gray-300 font-mono">
                          {proxy.ip || '127.0.0.1'}:{proxy.port || 'Chưa chọn'}
                        </code>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 mb-1">API Key</div>
                      <div className="bg-gray-900 rounded px-3 py-2 mb-2">
                        <code className="text-sm text-gray-300 break-all font-mono">
                          {proxy.apiKey}
                        </code>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(`${proxy.ip || '127.0.0.1'}:${proxy.port || ''}`, index)}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        Copy IP:Port
                      </button>
                      <button
                        onClick={() => copyToClipboard(proxy.apiKey, index)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        {copiedIndex === index ? 'Đã copy!' : 'Copy API Key'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Guide */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Cách sử dụng:</h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>
                  Kết nối SOCKS5: <code className="bg-gray-900 px-2 py-1 rounded">127.0.0.1:PORT</code> (PORT từ 11000-15000)
                </li>
                <li>Mỗi proxy có IP:Port và API Key riêng (xem danh sách phía trên)</li>
                <li>Sử dụng IP 127.0.0.1 và port đã chọn để kết nối SOCKS5 proxy</li>
                <li>IP sẽ tự động xoay, không cần cấu hình</li>
                <li>Xem hướng dẫn chi tiết tại trang hướng dẫn</li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-700">
              <button
                onClick={onSuccess}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Xem tất cả proxy
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
