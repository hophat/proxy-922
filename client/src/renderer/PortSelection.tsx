import React, { useState, useEffect } from 'react';

interface AvailablePort {
  port: number;
  gatewayId?: string;
  gatewayIp?: string;
  portId?: string;
}

interface PortSelectionProps {
  selectedPorts: number[];
  onPortsChange: (ports: number[]) => void;
  requiredCount: number;
  disabled?: boolean;
}

// Tạo danh sách port mặc định từ 4000-10000
const DEFAULT_PORTS: AvailablePort[] = Array.from({ length: 10000 - 4000 + 1 }, (_, i) => ({
  port: 4000 + i,
}));

export const PortSelection: React.FC<PortSelectionProps> = ({
  selectedPorts,
  onPortsChange,
  requiredCount,
  disabled = false,
}) => {
  const [availablePorts, setAvailablePorts] = useState<AvailablePort[]>(DEFAULT_PORTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [gateways, setGateways] = useState<Array<{ id: string; ip: string }>>([]);

  useEffect(() => {
    // Load gateways để hiển thị thông tin (optional)
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      const gatewaysData = await window.electronAPI?.portForward.getGateways();
      if (gatewaysData && Array.isArray(gatewaysData)) {
        setGateways(gatewaysData);
      }
    } catch (err: any) {
      console.error('Failed to load gateways:', err);
      // Không hiển thị error vì đây là optional
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
      (p.gatewayIp && p.gatewayIp.toLowerCase().includes(search))
    );
  });

  // Giới hạn chỉ hiển thị 20 port đầu tiên (trừ khi có search term)
  const MAX_DISPLAY_PORTS = 20;
  const portsToDisplay = searchTerm 
    ? filteredPorts 
    : filteredPorts.slice(0, MAX_DISPLAY_PORTS);

  // Group ports by gateway (nếu có gateway info) hoặc hiển thị tất cả port
  const portsByGateway = new Map<string, AvailablePort[]>();
  if (gateways.length > 0) {
    // Nếu có gateway info, group theo gateway
    gateways.forEach((gateway) => {
      portsByGateway.set(gateway.ip, portsToDisplay.map(p => ({ ...p, gatewayId: gateway.id, gatewayIp: gateway.ip })));
    });
  } else {
    // Nếu không có gateway info, hiển thị tất cả port trong một nhóm
    portsByGateway.set('Tất cả Gateway', portsToDisplay);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[#93adc8]">
          Chọn Port Forward ({selectedPorts.length}/{requiredCount} đã chọn)
        </label>
        <span className="text-xs text-[#93adc8]">
          Port: 4000-10000
        </span>
      </div>

      {error && (
        <div className="bg-red-600/20 text-red-400 px-4 py-3 rounded-lg text-sm">
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
          className="w-full px-4 py-2 bg-[#111a22] border border-[#344d65] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-[#93adc8]"
        />
      </div>

      {portsToDisplay.length === 0 ? (
        <div className="text-center text-[#93adc8] py-8">
          {searchTerm ? 'Không tìm thấy port nào' : 'Không có port nào khả dụng'}
        </div>
      ) : (
        <div className="bg-[#111a22] border border-[#344d65] rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
          {!searchTerm && filteredPorts.length > MAX_DISPLAY_PORTS && (
            <div className="text-xs text-[#93adc8] mb-2 text-center">
              Hiển thị {MAX_DISPLAY_PORTS} port đầu tiên. Sử dụng tìm kiếm để tìm port khác.
            </div>
          )}
          {Array.from(portsByGateway.entries()).map(([gatewayIp, ports]) => (
            <div key={gatewayIp} className="space-y-2">
              {gateways.length > 0 && (
                <div className="text-sm font-medium text-[#93adc8] mb-2">
                  Gateway: <span className="text-white font-mono">{gatewayIp}</span>
                </div>
              )}
              <div className="grid grid-cols-10 gap-2">
                {ports.map((portInfo) => {
                  const isSelected = selectedPorts.includes(portInfo.port);
                  const isDisabled = disabled || (!isSelected && selectedPorts.length >= requiredCount);

                  return (
                    <button
                      key={`${portInfo.port}-${gatewayIp}`}
                      type="button"
                      onClick={() => handlePortToggle(portInfo.port)}
                      disabled={isDisabled}
                      className={`
                        px-3 py-2 rounded text-sm font-mono transition-colors
                        ${
                          isSelected
                            ? 'bg-primary text-white border-2 border-blue-400'
                            : isDisabled
                            ? 'bg-[#1a2632] text-[#93adc8] opacity-50 cursor-not-allowed'
                            : 'bg-[#1a2632] text-[#93adc8] hover:bg-[#243647] border-2 border-transparent'
                        }
                      `}
                      title={`Port ${portInfo.port}${portInfo.gatewayIp ? ` - Gateway: ${portInfo.gatewayIp}` : ''}`}
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
        <div className="mt-4 p-3 bg-[#111a22] border border-[#344d65] rounded-lg">
          <div className="text-sm font-medium text-[#93adc8] mb-2">Port đã chọn:</div>
          <div className="flex flex-wrap gap-2">
            {selectedPorts.map((port) => {
              return (
                <div
                  key={port}
                  className="px-3 py-1 bg-primary text-white rounded text-sm font-mono flex items-center gap-2"
                >
                  <span>{port}</span>
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
