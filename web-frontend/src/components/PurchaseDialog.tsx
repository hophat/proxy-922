import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PublicGateway } from '../services/gateways';
import { purchasesService, PurchaseDuration, PurchaseResponse } from '../services/purchases';
import { PurchaseResult } from './PurchaseResult';

interface PurchaseDialogProps {
  gateway: PublicGateway;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  gateway,
  open,
  onOpenChange,
  onSuccess,
  onClose,
}) => {
  const [portCount, setPortCount] = useState(10);
  const [duration, setDuration] = useState<PurchaseDuration>(PurchaseDuration.HOURS_24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResponse | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset when dialog closes
      setPortCount(10);
      setDuration(PurchaseDuration.HOURS_24);
      setError(null);
      setPurchaseResult(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await purchasesService.createPurchase(
        gateway.id,
        portCount,
        duration,
      );
      setPurchaseResult(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Mua proxy thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
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
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-md p-6">
          <Dialog.Title className="text-xl font-bold text-white mb-4">
            Mua Proxy - {gateway.ipMasked}
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
                Số lượng Port (5-100)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="5"
                  max={Math.min(100, gateway.availablePortCount)}
                  value={portCount}
                  onChange={(e) => setPortCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">5</span>
                  <span className="text-lg font-semibold text-white">{portCount}</span>
                  <span className="text-sm text-gray-400">
                    {Math.min(100, gateway.availablePortCount)}
                  </span>
                </div>
                <input
                  type="number"
                  min="5"
                  max={Math.min(100, gateway.availablePortCount)}
                  value={portCount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 5 && value <= Math.min(100, gateway.availablePortCount)) {
                      setPortCount(value);
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
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

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">Tổng cộng:</span>
                <span className="text-xl font-bold text-white">
                  {portCount} port × {duration === PurchaseDuration.HOURS_24 ? '24h' : duration === PurchaseDuration.DAYS_7 ? '7d' : '30d'}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || portCount < 5 || portCount > gateway.availablePortCount}
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
