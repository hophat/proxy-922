import React from 'react';
import { PublicUpstream } from '../services/upstreams';

interface UpstreamCardProps {
  upstream: PublicUpstream;
  selected: boolean;
  onSelect: (upstream: PublicUpstream, selected: boolean) => void;
}

export const UpstreamCard: React.FC<UpstreamCardProps> = ({
  upstream,
  selected,
  onSelect,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400';
      case 'in_use':
        return 'bg-blue-500/20 text-blue-400';
      case 'unavailable':
        return 'bg-red-500/20 text-red-400';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Có sẵn';
      case 'in_use':
        return 'Đang sử dụng';
      case 'unavailable':
        return 'Không khả dụng';
      case 'maintenance':
        return 'Bảo trì';
      default:
        return status;
    }
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-5 border-2 transition-all cursor-pointer hover:shadow-lg ${
        selected
          ? 'border-blue-500 bg-blue-500/10 shadow-blue-500/20'
          : 'border-gray-700 hover:border-blue-400'
      }`}
      onClick={() => onSelect(upstream, !selected)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(upstream, !selected)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white font-mono">
                {upstream.host}:{upstream.port}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">SOCKS5 Proxy</p>
            </div>
          </div>
        </div>
        <span className={`px-2.5 py-1 ${getStatusColor(upstream.status)} text-xs font-medium rounded-full whitespace-nowrap`}>
          {getStatusText(upstream.status)}
        </span>
      </div>

      <div className="ml-8 space-y-2 pt-2 border-t border-gray-700/50">
        {upstream.country && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">📍 Địa điểm</span>
            <span className="text-sm text-white font-medium">
              {upstream.country}
              {upstream.city && `, ${upstream.city}`}
            </span>
          </div>
        )}
        {upstream.ping !== null && upstream.ping !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">⚡ Ping</span>
            <span className={`text-sm font-medium ${upstream.ping < 100 ? 'text-green-400' : upstream.ping < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
              {upstream.ping}ms
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500">💰 Giá</span>
          <span className="text-sm font-semibold text-green-400">$1/ngày</span>
        </div>
      </div>
    </div>
  );
};
