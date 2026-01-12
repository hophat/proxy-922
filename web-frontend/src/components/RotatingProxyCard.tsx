import React from 'react';
import { RotatingProxyPackage, RotationInterval } from '../services/rotating-proxies';

interface RotatingProxyCardProps {
  package: RotatingProxyPackage;
  onSelect: (pkg: RotatingProxyPackage) => void;
}

export const RotatingProxyCard: React.FC<RotatingProxyCardProps> = ({ package: pkg, onSelect }) => {
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

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            Gói {getRotationIntervalText(pkg.rotationInterval)}
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            IP xoay sau mỗi {getRotationIntervalText(pkg.rotationInterval).toLowerCase()}
          </p>
          {pkg.description && (
            <p className="text-sm text-gray-500 mb-4">{pkg.description}</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">${pkg.price}</span>
          <span className="text-sm text-gray-400">/tháng</span>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="text-green-400">✓</span>
          <span>Proxy xoay tự động</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="text-green-400">✓</span>
          <span>Kết nối qua Domain & API Key</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="text-green-400">✓</span>
          <span>Không giới hạn băng thông</span>
        </div>
      </div>

      <button
        onClick={() => onSelect(pkg)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Mua ngay
      </button>
    </div>
  );
};
