import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { upstreamsService, PublicUpstream } from '../services/upstreams';
import { UpstreamCard } from '../components/UpstreamCard';
import { UpstreamPurchaseDialog } from '../components/UpstreamPurchaseDialog';

export const UpstreamsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [upstreams, setUpstreams] = useState<PublicUpstream[]>([]);
  const [selectedUpstreams, setSelectedUpstreams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    upstream: PublicUpstream;
  } | null>(null);

  useEffect(() => {
    loadUpstreams();
  }, []);

  const loadUpstreams = async () => {
    try {
      setLoading(true);
      const data = await upstreamsService.getAvailableUpstreams();
      setUpstreams(data);
    } catch (error) {
      console.error('Failed to load upstreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUpstream = (upstream: PublicUpstream, selected: boolean) => {
    const newSelected = new Set(selectedUpstreams);
    if (selected) {
      newSelected.add(upstream.id);
    } else {
      newSelected.delete(upstream.id);
    }
    setSelectedUpstreams(newSelected);
  };

  const handleRightClick = (e: React.MouseEvent, upstream: PublicUpstream) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      upstream,
    });
  };

  const handleContextMenuAction = (action: 'port-forward') => {
    if (!contextMenu) return;

    if (action === 'port-forward') {
      // Select only this upstream and open purchase dialog
      setSelectedUpstreams(new Set([contextMenu.upstream.id]));
      setShowPurchaseDialog(true);
    }

    setContextMenu(null);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    setSelectedUpstreams(new Set());
    navigate('/purchases');
  };

  const handleClosePurchaseDialog = () => {
    setShowPurchaseDialog(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Upstream Proxies
        </h1>
        <p className="text-gray-400">
          Chọn upstream proxy và mua port forward. Click chuột phải để mua port forward cho upstream.
        </p>
      </div>

      {selectedUpstreams.size > 0 && (
        <div className="mb-6 bg-blue-600/20 border border-blue-500/50 rounded-lg p-4 flex items-center justify-between">
          <div className="text-white">
            Đã chọn <span className="font-bold">{selectedUpstreams.size}</span> upstream
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedUpstreams(new Set())}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Bỏ chọn tất cả
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/login');
                  return;
                }
                setShowPurchaseDialog(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Mua Port Forward ({selectedUpstreams.size})
            </button>
          </div>
        </div>
      )}

      {upstreams.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl text-gray-300 mb-2">Hiện tại không có upstream nào khả dụng</p>
          <p className="text-gray-500">Vui lòng quay lại sau hoặc liên hệ admin để được hỗ trợ.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              Danh sách Upstream ({upstreams.length})
            </h2>
            <button
              onClick={loadUpstreams}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Làm mới
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upstreams.map((upstream) => (
              <div
                key={upstream.id}
                onContextMenu={(e) => handleRightClick(e, upstream)}
              >
                <UpstreamCard
                  upstream={upstream}
                  selected={selectedUpstreams.has(upstream.id)}
                  onSelect={handleSelectUpstream}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-2 min-w-[200px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextMenuAction('port-forward')}
            className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <span>🔌</span>
            <span>Mua Port Forward</span>
          </button>
        </div>
      )}

      {/* Purchase Dialog */}
      {showPurchaseDialog && (
        <UpstreamPurchaseDialog
          upstreams={upstreams.filter((u) => selectedUpstreams.has(u.id))}
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          onSuccess={handlePurchaseSuccess}
          onClose={handleClosePurchaseDialog}
        />
      )}
    </div>
  );
};
