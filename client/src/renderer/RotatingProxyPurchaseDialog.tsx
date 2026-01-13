import React, { useState, useEffect } from 'react';
import { PaymentDialog } from './PaymentDialog';

type PurchaseDuration = '1d' | '3d' | '7d' | '15d';

interface PaymentOrder {
  id: string;
  orderCode: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qrCodeUrl: string | null;
  vaNumber: string | null;
  accountName: string | null;
  expiredAt: string;
  createdAt: string;
}

interface RotatingProxyPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export const RotatingProxyPurchaseDialog: React.FC<RotatingProxyPurchaseDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onClose,
}) => {
  const [proxyCount, setProxyCount] = useState(1);
  const [duration, setDuration] = useState<PurchaseDuration>('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (!open) {
      setProxyCount(1);
      setDuration('1d');
      setError(null);
      setPaymentOrder(null);
      setShowPaymentDialog(false);
    }
  }, [open]);

  const handlePurchase = async () => {
    if (proxyCount < 1 || proxyCount > 100) {
      setError('Số lượng proxy phải từ 1 đến 100');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const order = await window.electronAPI?.payments.createRotatingProxyOrder({
        proxyCount,
        duration,
      });

      if (order) {
        setPaymentOrder(order);
        setShowPaymentDialog(true);
      }
    } catch (err: any) {
      console.error('Failed to create payment order:', err);
      setError(err.message || 'Tạo đơn hàng thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setPaymentOrder(null);
    onSuccess();
    onOpenChange(false);
  };

  const handlePaymentClose = () => {
    setShowPaymentDialog(false);
  };

  const handleStatusCheck = async (orderCode: string): Promise<PaymentOrder | null> => {
    try {
      const order = await window.electronAPI?.payments.getOrderStatus(orderCode);
      if (order) {
        setPaymentOrder(order);
        return order;
      }
      return null;
    } catch (err: any) {
      console.error('Failed to check order status:', err);
      return null;
    }
  };

  const calculateTotalPrice = () => {
    const days = getDaysFromDuration(duration);
    return proxyCount * 4000 * days;
  };

  const getDaysFromDuration = (duration: PurchaseDuration): number => {
    switch (duration) {
      case '1d':
        return 1;
      case '3d':
        return 3;
      case '7d':
        return 7;
      case '15d':
        return 15;
      default:
        return 1;
    }
  };

  const durationLabels: Record<PurchaseDuration, string> = {
    '1d': '1 ngày',
    '3d': '3 ngày',
    '7d': '7 ngày',
    '15d': '15 ngày',
  };

  if (!open) return null;

  return (
    <>
      {/* Payment Dialog - z-index cao hơn để hiển thị trên cùng */}
      {showPaymentDialog && paymentOrder && (
        <PaymentDialog
          order={paymentOrder}
          open={showPaymentDialog}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          onStatusCheck={handleStatusCheck}
        />
      )}

      {/* Purchase Dialog - ẩn khi có PaymentDialog */}
      <div className={`fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 ${showPaymentDialog ? 'hidden' : ''}`}>
        <div className="bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Mua Proxy Xoay</h2>
              <button
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePurchase();
              }}
              className="space-y-6"
            >
              {error && (
                <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Số lượng proxy (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={proxyCount}
                  onChange={(e) => setProxyCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Mỗi proxy sẽ có 1 API key riêng
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Thời hạn sử dụng
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['1d', '3d', '7d', '15d'] as PurchaseDuration[]).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setDuration(dur)}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        duration === dur
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                      }`}
                      disabled={loading}
                    >
                      <div className="font-semibold">{durationLabels[dur]}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {getDaysFromDuration(dur) * 4000} VNĐ/proxy
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Thông tin quan trọng:</h3>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Proxy xoay IP tự động, không cần chọn IP cụ thể</li>
                  <li>Mỗi proxy có Domain và API Key riêng</li>
                  <li>Giá: 4,000 VNĐ/proxy/ngày</li>
                  <li>Hỗ trợ SOCKS5 protocol</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">Tổng cộng:</span>
                  <span className="text-xl font-bold text-white">
                    {calculateTotalPrice().toLocaleString('vi-VN')} VNĐ ({proxyCount} proxy ×{' '}
                    {durationLabels[duration]})
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || proxyCount < 1 || proxyCount > 100}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Đang xử lý...' : 'Mua ngay'}
                </button>
              </div>
            </form>
        </div>
      </div>
    </>
  );
};
