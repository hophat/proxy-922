import React, { useState, useRef, useEffect, useCallback } from 'react';

interface QuickPortSelectPopoverProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onSelectPort: (port: number) => void;
  upstreamId: string;
  upstreamHost: string;
}

// Tạo danh sách port mặc định từ 4000-10000
const ALL_PORTS = Array.from({ length: 10000 - 4000 + 1 }, (_, i) => 4000 + i);
const PORTS_PER_PAGE = 20; // Số port hiển thị mỗi lần

export const QuickPortSelectPopover: React.FC<QuickPortSelectPopoverProps> = ({
  open,
  onClose,
  position,
  onSelectPort,
  upstreamId,
  upstreamHost,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedCount, setDisplayedCount] = useState(PORTS_PER_PAGE);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setDisplayedCount(PORTS_PER_PAGE);
      // Reset scroll position
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open, onClose]);

  const filteredPorts = ALL_PORTS.filter((port) => {
    if (!searchTerm) return true;
    return port.toString().includes(searchTerm);
  });

  // Khi có search term, hiển thị tất cả kết quả tìm kiếm
  const portsToDisplay = searchTerm 
    ? filteredPorts 
    : filteredPorts.slice(0, displayedCount);

  const handlePortClick = (port: number) => {
    onSelectPort(port);
    onClose();
  };

  // Handle scroll để load thêm port
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (searchTerm) return; // Không lazy load khi đang search

    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    
    // Khi scroll gần đến cuối (còn 100px), load thêm
    if (scrollBottom < 100 && displayedCount < filteredPorts.length) {
      setDisplayedCount(prev => Math.min(prev + PORTS_PER_PAGE, filteredPorts.length));
    }
  }, [searchTerm, displayedCount, filteredPorts.length]);

  if (!open) return null;

  // Tính toán vị trí để không bị tràn ra ngoài màn hình
  const getAdjustedPosition = () => {
    const popoverWidth = 360;
    const popoverHeight = 400;
    const padding = 10;

    let left = position.x;
    let top = position.y;

    // Kiểm tra và điều chỉnh nếu tràn bên phải
    if (left + popoverWidth > window.innerWidth) {
      left = window.innerWidth - popoverWidth - padding;
    }

    // Kiểm tra và điều chỉnh nếu tràn bên dưới
    if (top + popoverHeight > window.innerHeight) {
      top = window.innerHeight - popoverHeight - padding;
    }

    // Đảm bảo không tràn bên trái và trên
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    return { left, top };
  };

  const adjustedPosition = getAdjustedPosition();

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] bg-[#1a2632] border border-[#344d65] rounded-lg shadow-xl"
      style={{
        left: `${adjustedPosition.left}px`,
        top: `${adjustedPosition.top}px`,
        width: '360px',
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="p-3 border-b border-[#344d65] flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-semibold text-xs">Chọn Port Forward</h3>
          <button
            onClick={onClose}
            className="text-[#93adc8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
        <p className="text-xs text-[#93adc8] truncate">
          Proxy: <span className="text-white font-mono text-xs">{upstreamHost}</span>
        </p>
      </div>

      <div className="p-3 flex flex-col flex-1 min-h-0">
        <div className="mb-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Tìm port..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1.5 bg-[#111a22] border border-[#344d65] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-[#93adc8] text-xs"
            autoFocus
          />
        </div>

        <div 
          ref={scrollContainerRef}
          className="bg-[#111a22] border border-[#344d65] rounded-lg p-2 flex-1 overflow-y-auto min-h-0"
          onScroll={handleScroll}
        >
          {portsToDisplay.length === 0 ? (
            <div className="text-center text-[#93adc8] py-6 text-xs">
              Không tìm thấy port nào
            </div>
          ) : (
            <>
              <div className="grid grid-cols-8 gap-1.5">
                {portsToDisplay.map((port) => (
                  <button
                    key={port}
                    type="button"
                    onClick={() => handlePortClick(port)}
                    className="px-1.5 py-1 rounded text-xs font-mono bg-[#243647] hover:bg-primary hover:text-white text-[#93adc8] transition-colors border border-transparent hover:border-blue-400 active:scale-95"
                    title={`Chọn port ${port}`}
                  >
                    {port}
                  </button>
                ))}
              </div>
              {!searchTerm && displayedCount < filteredPorts.length && (
                <div className="text-center text-[#93adc8] text-xs mt-2 py-1">
                  Đang tải... ({displayedCount}/{filteredPorts.length})
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
