import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RotatingProxyPurchaseResponse, RotationInterval } from '../services/rotating-proxies';
import { formatDate } from '../utils/format';

interface RotatingProxyResultProps {
  purchase: RotatingProxyPurchaseResponse;
  onClose: () => void;
  onViewPurchases: () => void;
}

export const RotatingProxyResult: React.FC<RotatingProxyResultProps> = ({
  purchase,
  onClose,
  onViewPurchases,
}) => {
  const [copiedField, setCopiedField] = useState<'domain' | 'apiKey' | null>(null);

  const copyToClipboard = async (text: string, field: 'domain' | 'apiKey') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getRotationIntervalText = (interval: RotationInterval) => {
    switch (interval) {
      case RotationInterval.MINUTES_5:
        return '5 phút';
      case RotationInterval.MINUTES_15:
        return '15 phút';
      case RotationInterval.MINUTES_60:
        return '60 phút';
      default:
        return `${interval} phút`;
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

  return (
    <div>
      <Dialog.Title className="text-2xl font-bold text-white mb-4">
        Mua Proxy Xoay Thành Công!
      </Dialog.Title>

      <div className="space-y-6">
        {/* Package Info */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Thông tin gói</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Rotation Interval:</span>
              <span className="text-white font-semibold">
                {getRotationIntervalText(purchase.rotationInterval)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Thời hạn:</span>
              <span className="text-white">{getDurationText(purchase.duration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hết hạn:</span>
              <span className="text-white">{formatDate(purchase.expiresAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Giá:</span>
              <span className="text-white font-semibold">${purchase.price}</span>
            </div>
          </div>
        </div>

        {/* Domain */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Domain</h3>
          <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
            <code className="text-sm text-gray-300 break-all">{purchase.domain}</code>
          </div>
          <button
            onClick={() => copyToClipboard(purchase.domain, 'domain')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {copiedField === 'domain' ? 'Đã copy!' : 'Copy Domain'}
          </button>
        </div>

        {/* API Key */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">API Key</h3>
          <div className="bg-gray-800 rounded px-4 py-3 border border-gray-700 mb-3">
            <code className="text-sm text-gray-300 break-all font-mono">
              {purchase.apiKey}
            </code>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
            <p className="text-xs text-yellow-400">
              ⚠️ Lưu ý: API Key chỉ hiển thị một lần. Vui lòng lưu lại cẩn thận.
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(purchase.apiKey, 'apiKey')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            {copiedField === 'apiKey' ? 'Đã copy!' : 'Copy API Key'}
          </button>
        </div>

        {/* Usage Guide */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Cách sử dụng:</h3>
          <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
            <li>Domain: <code className="bg-gray-900 px-2 py-1 rounded">{purchase.domain}</code></li>
            <li>API Key: <code className="bg-gray-900 px-2 py-1 rounded font-mono">{purchase.apiKey}</code></li>
            <li>Sử dụng domain và API key để kết nối SOCKS5 proxy</li>
            <li>IP sẽ tự động xoay sau mỗi {getRotationIntervalText(purchase.rotationInterval).toLowerCase()}</li>
            <li>Xem hướng dẫn chi tiết tại trang hướng dẫn</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-700">
          <button
            onClick={onViewPurchases}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Xem tất cả mua hàng
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
  );
};
