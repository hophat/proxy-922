import React from 'react';
import { PublicProxy } from '../services/proxies';

interface ProxyCardProps {
  proxy: PublicProxy;
  onSelect: (proxy: PublicProxy) => void;
}

export const ProxyCard: React.FC<ProxyCardProps> = ({ proxy, onSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'dead':
        return 'bg-red-500/20 text-red-400';
      case 'disabled':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'dead':
        return 'Không hoạt động';
      case 'disabled':
        return 'Tạm dừng';
      default:
        return status;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {proxy.host}:{proxy.port}
          </h3>
          <p className="text-sm text-gray-400">
            SOCKS5 Proxy
          </p>
        </div>
        <span className={`px-3 py-1 ${getStatusColor(proxy.status)} text-xs font-medium rounded-full`}>
          {getStatusText(proxy.status)}
        </span>
      </div>

      {proxy.lastCheck && (
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            Kiểm tra lần cuối: {new Date(proxy.lastCheck).toLocaleString('vi-VN')}
          </p>
        </div>
      )}

      <button
        onClick={() => onSelect(proxy)}
        disabled={proxy.status !== 'active'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {proxy.status !== 'active' ? 'Không khả dụng' : 'Chọn proxy'}
      </button>
    </div>
  );
};
