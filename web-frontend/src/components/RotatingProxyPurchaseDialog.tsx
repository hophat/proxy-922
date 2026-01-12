import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RotatingProxyPackage, RotationInterval, PurchaseDuration, rotatingProxiesService, RotatingProxyPurchaseResponse } from '../services/rotating-proxies';
import { RotatingProxyResult } from './RotatingProxyResult';

interface RotatingProxyPurchaseDialogProps {
  package: RotatingProxyPackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export const RotatingProxyPurchaseDialog: React.FC<RotatingProxyPurchaseDialogProps> = ({
  package: pkg,
  open,
  onOpenChange,
  onSuccess,
  onClose,
}) => {
  const [duration, setDuration] = useState<PurchaseDuration>(PurchaseDuration.HOURS_24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<RotatingProxyPurchaseResponse | null>(null);

  useEffect(() => {
    if (!open) {
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
      const result = await rotatingProxiesService.createPurchase(pkg.rotationInterval, duration);
      setPurchaseResult(result);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Mua proxy xoay thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

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

  if (purchaseResult) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <RotatingProxyResult
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
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close"
              onClick={handleClose}
            >
              ×
            </button>
          </Dialog.Close>

          <Dialog.Title className="text-2xl font-bold text-white mb-4">
            Mua Proxy Xoay - Gói {getRotationIntervalText(pkg.rotationInterval)}
          </Dialog.Title>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Package Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Thông tin gói</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rotation Interval:</span>
                    <span className="text-white font-semibold">
                      {getRotationIntervalText(pkg.rotationInterval)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Giá:</span>
                    <span className="text-white font-semibold">${pkg.price}/tháng</span>
                  </div>
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Chọn thời hạn
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDuration(PurchaseDuration.HOURS_24)}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      duration === PurchaseDuration.HOURS_24
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold">24 giờ</div>
                    <div className="text-xs text-gray-400 mt-1">
                      ${(pkg.price / 30).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(PurchaseDuration.DAYS_7)}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      duration === PurchaseDuration.DAYS_7
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold">7 ngày</div>
                    <div className="text-xs text-gray-400 mt-1">
                      ${((pkg.price * 7) / 30).toFixed(2)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(PurchaseDuration.DAYS_30)}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      duration === PurchaseDuration.DAYS_30
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold">30 ngày</div>
                    <div className="text-xs text-gray-400 mt-1">${pkg.price.toFixed(2)}</div>
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Thông tin quan trọng:</h3>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Proxy sẽ xoay IP sau mỗi {getRotationIntervalText(pkg.rotationInterval).toLowerCase()}</li>
                  <li>Bạn sẽ nhận Domain và API Key để kết nối</li>
                  <li>Không cần cấu hình IP, chỉ cần domain và API key</li>
                  <li>Hỗ trợ SOCKS5 protocol</li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Đang xử lý...' : 'Mua ngay'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
