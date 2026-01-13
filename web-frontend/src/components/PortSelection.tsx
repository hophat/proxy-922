import React, { useState, useEffect } from 'react';
import { purchasesService } from '../services/purchases';

interface AvailablePort {
  port: number;
  gatewayId: string;
  gatewayIp: string;
  portId: string;
}

interface PortSelectionProps {
  selectedPorts: number[];
  onPortsChange: (ports: number[]) => void;
  requiredCount: number;
  disabled?: boolean;
}

export const PortSelection: React.FC<PortSelectionProps> = ({
  selectedPorts,
  onPortsChange,
  requiredCount,
  disabled = false,
}) => {
  const [availablePorts, setAvailablePorts] = useState<AvailablePort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAvailablePorts();
  }, []);

  const loadAvailablePorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const ports = await purchasesService.getAvailablePorts();
      // Sort by port number
      ports.sort((a, b) => a.port - b.port);
      setAvailablePorts(ports);
    } catch (err: any) {
      console.error('Failed to load available ports:', err);
      setError('Không thể tải danh sách port. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePortToggle = (port: number) => {
    if (disabled) return;

    const newSelected = [...selectedPorts];
    const index = newSelected.indexOf(port);

    if (index > -1) {
      // Deselect
      newSelected.splice(index, 1);
    } else {
      // Select (but limit to requiredCount)
      if (newSelected.length < requiredCount) {
        newSelected.push(port);
        newSelected.sort((a, b) => a - b);
      }
    }

    onPortsChange(newSelected);
  };

  const filteredPorts = availablePorts.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.port.toString().includes(search) ||
      p.gatewayIp.toLowerCase().includes(search)
    );
  });

  // Group ports by gateway
  const portsByGateway = new Map<string, AvailablePort[]>();
  filteredPorts.forEach((port) => {
    if (!portsByGateway.has(port.gatewayIp)) {
      portsByGateway.set(port.gatewayIp, []);
    }
    portsByGateway.get(port.gatewayIp)!.push(port);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          Chọn Port ({selectedPorts.length}/{requiredCount} đã chọn)
        </label>
        <button
          type="button"
          onClick={loadAvailablePorts}
          disabled={loading}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {selectedPorts.length < requiredCount && (
        <div className="bg-yellow-500/10 text-yellow-400 px-4 py-3 rounded-lg text-sm">
          Vui lòng chọn {requiredCount - selectedPorts.length} port nữa
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm port hoặc gateway IP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Đang tải danh sách port...</div>
      ) : filteredPorts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {searchTerm ? 'Không tìm thấy port nào' : 'Không có port nào khả dụng'}
        </div>
      ) : (
        <div className="bg-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
          {Array.from(portsByGateway.entries()).map(([gatewayIp, ports]) => (
            <div key={gatewayIp} className="space-y-2">
              <div className="text-sm font-medium text-gray-300 mb-2">
                Gateway: <span className="text-white font-mono">{gatewayIp}</span>
              </div>
              <div className="grid grid-cols-10 gap-2">
                {ports.map((portInfo) => {
                  const isSelected = selectedPorts.includes(portInfo.port);
                  const isDisabled = disabled || (!isSelected && selectedPorts.length >= requiredCount);

                  return (
                    <button
                      key={portInfo.portId}
                      type="button"
                      onClick={() => handlePortToggle(portInfo.port)}
                      disabled={isDisabled}
                      className={`
                        px-3 py-2 rounded text-sm font-mono transition-colors
                        ${
                          isSelected
                            ? 'bg-blue-600 text-white border-2 border-blue-400'
                            : isDisabled
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
                        }
                      `}
                      title={`Port ${portInfo.port} - Gateway: ${portInfo.gatewayIp}`}
                    >
                      {portInfo.port}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPorts.length > 0 && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <div className="text-sm font-medium text-gray-300 mb-2">Port đã chọn:</div>
          <div className="flex flex-wrap gap-2">
            {selectedPorts.map((port) => {
              const portInfo = availablePorts.find((p) => p.port === port);
              return (
                <div
                  key={port}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-mono flex items-center gap-2"
                >
                  <span>{port}</span>
                  {portInfo && (
                    <span className="text-xs text-blue-200">({portInfo.gatewayIp})</span>
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handlePortToggle(port)}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
