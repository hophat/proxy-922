import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PublicUpstream } from '../services/upstreams';
import { purchasesService, PurchaseDuration, PurchaseResponse } from '../services/purchases';
import { gatewaysService, PublicGateway } from '../services/gateways';
import { PurchaseResult } from './PurchaseResult';

interface UpstreamPurchaseDialogProps {
  upstreams: PublicUpstream[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export const UpstreamPurchaseDialog: React.FC<UpstreamPurchaseDialogProps> = ({
  upstreams,
  open,
  onOpenChange,
  onSuccess,
  onClose,
}) => {
  const [selectedUpstreamIds, setSelectedUpstreamIds] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<PurchaseDuration>(PurchaseDuration.HOURS_24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);
  const [gateway, setGateway] = useState<PublicGateway | null>(null);
  const [gateways, setGateways] = useState<PublicGateway[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedUpstreamIds(new Set());
      setDuration(PurchaseDuration.HOURS_24);
      setError(null);
      setPurchaseResult(null);
    } else {
      // Load gateways mỗi lần mở dialog
      loadGateways();
    }
  }, [open]);

  const loadGateways = async () => {
    try {
      setLoadingGateways(true);
      const gatewaysData = await gatewaysService.getGateways();
      setGateways(gatewaysData);
      // Auto-select gateway đầu tiên có ports available và active
      const availableGateway = gatewaysData.find(
        (gw) => gw.status === 'active' && gw.availablePortCount > 0,
      );
      if (availableGateway) {
        setGateway(availableGateway);
      } else if (gatewaysData.length > 0) {
        setGateway(gatewaysData[0]);
      }
    } catch (error) {
      console.error('Failed to load gateways:', error);
      setError('Không thể tải danh sách gateway. Vui lòng thử lại.');
    } finally {
      setLoadingGateways(false);
    }
  };

  const handleToggleUpstream = (upstreamId: string) => {
    const newSelected = new Set(selectedUpstreamIds);
    if (newSelected.has(upstreamId)) {
      newSelected.delete(upstreamId);
    } else {
      newSelected.add(upstreamId);
    }
    setSelectedUpstreamIds(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (selectedUpstreamIds.size === 0) {
      setError('Vui lòng chọn ít nhất một upstream');
      setLoading(false);
      return;
    }

    if (!gateway) {
      setError('Không tìm thấy gateway');
      setLoading(false);
      return;
    }

    try {
      const upstreamIdsArray = Array.from(selectedUpstreamIds);
      const result = await purchasesService.createUpstreamPurchase(
        upstreamIdsArray,
        gateway.id,
        duration,
      );
      setPurchaseResult(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Mua upstream thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  const calculateTotalPrice = () => {
    const basePricePerUpstream = 1.0; // $1 per upstream per day
    let days = 1;
    switch (duration) {
      case PurchaseDuration.HOURS_24:
        days = 1;
        break;
      case PurchaseDuration.DAYS_7:
        days = 7;
        break;
      case PurchaseDuration.DAYS_30:
        days = 30;
        break;
    }
    return selectedUpstreamIds.size * basePricePerUpstream * days;
  };

  if (purchaseResult) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <PurchaseResult
              purchase={purchaseResult}
              onClose={handleClose}
              onViewPurchases={onSuccess}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <Dialog.Title className="text-xl font-bold text-white mb-4">
            Mua Upstream Proxy
          </Dialog.Title>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </Dialog.Close>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Chọn Upstreams ({selectedUpstreamIds.size} đã chọn)
              </label>
              <div className="bg-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {upstreams.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">
                    Không có upstream nào khả dụng
                  </p>
                ) : (
                  upstreams.map((upstream) => (
                    <div
                      key={upstream.id}
                      className="flex items-center gap-3 p-3 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUpstreamIds.has(upstream.id)}
                        onChange={() => handleToggleUpstream(upstream.id)}
                        className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {upstream.host}:{upstream.port}
                        </div>
                        {upstream.country && (
                          <div className="text-sm text-gray-400">
                            {upstream.country}
                            {upstream.city && `, ${upstream.city}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Thời hạn sử dụng
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as PurchaseDuration)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value={PurchaseDuration.HOURS_24}>24 giờ</option>
                <option value={PurchaseDuration.DAYS_7}>7 ngày</option>
                <option value={PurchaseDuration.DAYS_30}>30 ngày</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Chọn Gateway
              </label>
              {loadingGateways ? (
                <div className="text-gray-400 text-sm py-2">Đang tải gateway...</div>
              ) : gateways.length === 0 ? (
                <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
                  Không có gateway nào khả dụng
                </div>
              ) : (
                <select
                  value={gateway?.id || ''}
                  onChange={(e) => {
                    const selected = gateways.find((gw) => gw.id === e.target.value);
                    if (selected) {
                      setGateway(selected);
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  {gateways.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      {gw.ipMasked} - Ports: {gw.availablePortCount} available
                      {gw.status !== 'active' ? ' (Không khả dụng)' : ''}
                    </option>
                  ))}
                </select>
              )}
              {gateway && (
                <div className="mt-2 bg-gray-700/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>IP Gateway:</span>
                    <span className="text-white font-mono">{gateway.ipMasked}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Port Range:</span>
                    <span className="text-white">
                      {gateway.portRangeStart} - {gateway.portRangeEnd}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Ports khả dụng:</span>
                    <span className="text-green-400 font-semibold">
                      {gateway.availablePortCount}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">Tổng cộng:</span>
                <span className="text-xl font-bold text-white">
                  ${calculateTotalPrice().toFixed(2)} ({selectedUpstreamIds.size} upstreams ×{' '}
                  {duration === PurchaseDuration.HOURS_24
                    ? '24h'
                    : duration === PurchaseDuration.DAYS_7
                    ? '7d'
                    : '30d'}
                  )
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || selectedUpstreamIds.size === 0 || !gateway}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Mua ngay'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
