import React, { useState, useEffect } from 'react';
import { PaymentDialog } from './PaymentDialog';

interface PaymentOrder {
  id: string;
  orderCode: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qrCodeUrl: string | null;
  vaNumber: string | null;
  accountName: string | null;
  expiredAt: string;
  createdAt: string;
}

interface RotatingProxy {
  id: string;
  domain: string;
  apiKey: string;
  ip: string;
  port: number | null;
  expiresAt: string;
  duration: string;
  status: string;
}

interface RotatingProxyResultProps {
  order: PaymentOrder;
  proxyCount: number;
  duration: string;
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
  const [proxies, setProxies] = useState<RotatingProxy[]>([]);
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
          const proxies = await window.electronAPI?.payments.getMyRotatingProxies();
          if (proxies && proxies.length > 0) {
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
      const proxies = await window.electronAPI?.payments.getMyRotatingProxies();
      if (proxies) {
        setProxies(proxies);
        if (proxies[0]) {
          setDomain(proxies[0].domain);
        }
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

  if (order.status !== 'paid') {
    return (
      <PaymentDialog
        order={order}
        open={true}
        onClose={onClose}
        onSuccess={onSuccess}
        onStatusCheck={async (orderCode: string) => {
          return await window.electronAPI?.payments.getOrderStatus(orderCode) || null;
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl p-6">
          <div className="text-center">
            <div className="text-lg text-gray-400 mb-4">Đang tải thông tin proxy...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Mua Proxy Xoay Thành Công!</h2>

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
      </div>
    </div>
  );
};
