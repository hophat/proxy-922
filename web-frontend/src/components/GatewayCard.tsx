import React from 'react';
import { PublicGateway } from '../services/gateways';

interface GatewayCardProps {
  gateway: PublicGateway;
  onSelect: (gateway: PublicGateway) => void;
}

export const GatewayCard: React.FC<GatewayCardProps> = ({ gateway, onSelect }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Gateway IP: {gateway.ipMasked}
          </h3>
          <p className="text-sm text-gray-400">
            Port Range: {gateway.portRangeStart} - {gateway.portRangeEnd}
          </p>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
          {gateway.status === 'active' ? 'Hoạt động' : 'Bảo trì'}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-300">
          Ports khả dụng: <span className="font-semibold text-white">{gateway.availablePortCount}</span>
        </p>
      </div>

      <button
        onClick={() => onSelect(gateway)}
        disabled={gateway.availablePortCount === 0 || gateway.status !== 'active'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {gateway.availablePortCount === 0
          ? 'Hết port'
          : gateway.status !== 'active'
          ? 'Không khả dụng'
          : 'Chọn mua'}
      </button>
    </div>
  );
};
