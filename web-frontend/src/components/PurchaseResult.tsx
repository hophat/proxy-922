import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PurchaseResponse } from '../services/purchases';
import { formatSocks5Connection, formatDate } from '../utils/format';

interface PurchaseResultProps {
  purchase: PurchaseResponse;
  onClose: () => void;
  onViewPurchases: () => void;
}

export const PurchaseResult: React.FC<PurchaseResultProps> = ({
  purchase,
  onClose,
  onViewPurchases,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div>
      <Dialog.Title className="text-2xl font-bold text-white mb-4">
        Mua Proxy Thành Công!
      </Dialog.Title>

      <div className="space-y-6">
        {/* Gateway Info */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Thông tin Gateway</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Gateway IP:</span>
              <span className="text-white font-mono">{purchase.gateway.ip}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Port Range:</span>
              <span className="text-white">
                {purchase.gateway.portRangeStart} - {purchase.gateway.portRangeEnd}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Thời hạn:</span>
              <span className="text-white">
                {purchase.duration === '24h' ? '24 giờ' : purchase.duration === '7d' ? '7 ngày' : '30 ngày'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Hết hạn:</span>
              <span className="text-white">{formatDate(purchase.expiresAt)}</span>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Thông tin đăng nhập</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Username:</span>
              <span className="text-white font-mono">{purchase.credentials.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Password:</span>
              <span className="text-white font-mono">{purchase.credentials.password}</span>
            </div>
          </div>
        </div>

        {/* Ports & Connection Strings */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Danh sách Ports ({purchase.ports.length} ports)
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {purchase.ports.map((port, index) => {
              const connectionString = formatSocks5Connection(
                purchase.gateway.ip,
                port.port,
                purchase.credentials.username,
                purchase.credentials.password,
              );

              return (
                <div
                  key={port.id}
                  className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-400">Port:</span>
                        <span className="text-white font-mono font-semibold">
                          {port.port}
                        </span>
                      </div>
                      <div className="bg-gray-800 rounded px-3 py-2 border border-gray-700">
                        <code className="text-xs text-gray-300 break-all">
                          {connectionString}
                        </code>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(connectionString, index)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                    >
                      {copiedIndex === index ? 'Đã copy!' : 'Copy'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
