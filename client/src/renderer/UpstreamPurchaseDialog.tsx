import React, { useState, useEffect } from 'react';
import { PaymentDialog } from './PaymentDialog';
import { PortSelection } from './PortSelection';

interface PublicUpstream {
  id: string;
  host: string;
  port: number;
  country?: string;
  state?: string;
  city?: string;
  ping?: number;
  status: string;
}

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

interface UpstreamPurchaseDialogProps {
  upstreams: PublicUpstream[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClose: () => void;
  preSelectedPorts?: number[]; // Optional: Ports đã được chọn trước (từ quick select)
}

type PurchaseDuration = '24h' | '7d' | '30d';

export const UpstreamPurchaseDialog: React.FC<UpstreamPurchaseDialogProps> = ({
  upstreams,
  open,
  onOpenChange,
  onSuccess,
  onClose,
  preSelectedPorts = [],
}) => {
  const [duration, setDuration] = useState<PurchaseDuration>('24h');
  const [gatewayId, setGatewayId] = useState<string>('');
  const [selectedPorts, setSelectedPorts] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [paymentOrder, setPaymentOrder] = useState<PaymentOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (open) {
      // Auto-select first gateway (you might want to load gateways from API)
      // For now, we'll use empty string and let backend auto-select
      setGatewayId('');
      setDuration('24h');
      // Nếu có preSelectedPorts, sử dụng nó; nếu không thì reset
      if (preSelectedPorts.length > 0) {
        setSelectedPorts([...preSelectedPorts]);
      } else {
        setSelectedPorts([]);
      }
      setError(undefined);
      setPaymentOrder(null);
      setShowPaymentDialog(false);
    }
  }, [open, preSelectedPorts]);

  // Reset selected ports when upstream selection changes (chỉ khi không có preSelectedPorts)
  // Loại bỏ useEffect này vì nó đang gây conflict với preSelectedPorts
  // Logic reset đã được xử lý trong useEffect đầu tiên

  const handlePurchase = async () => {
    if (upstreams.length === 0) {
      setError('Vui lòng chọn ít nhất một proxy');
      return;
    }

    if (selectedPorts.length !== upstreams.length) {
      setError(`Vui lòng chọn đúng ${upstreams.length} port (mỗi proxy cần 1 port)`);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      const upstreamIds = upstreams.map((u) => u.id);
      
      // Create payment order instead of purchase directly
      const order = await window.electronAPI?.payments.createOrder({
        upstreamIds,
        gatewayId: gatewayId || undefined, // Let backend auto-select if empty
        duration,
        selectedPorts: selectedPorts.length > 0 ? selectedPorts : undefined,
      });

      if (order) {
        setPaymentOrder(order);
        setShowPaymentDialog(true);
        // Không đóng dialog mua hàng, chỉ ẩn nó (PaymentDialog sẽ có z-index cao hơn)
      }
    } catch (err: any) {
      console.error('Failed to create payment order:', err);
      setError(err.message || 'Failed to create payment order');
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
    // Keep payment order for later checking
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

  if (!open) return null;

  const durationLabels: Record<PurchaseDuration, string> = {
    '24h': '24 giờ',
    '7d': '7 ngày',
    '30d': '30 ngày',
  };

  const durationPrices: Record<PurchaseDuration, number> = {
    '24h': 10000,   // 1 ngày: 10,000 VNĐ
    '7d': 65000,    // 7 ngày: 65,000 VNĐ
    '30d': 250000,  // 30 ngày: 250,000 VNĐ
  };

  const totalPrice = upstreams.length * durationPrices[duration];

  // Format số tiền VNĐ
  const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  // Tính toán các cột cần hiển thị
  const hasState = upstreams.some(u => u.state);
  const hasCity = upstreams.some(u => u.city);
  const hasPing = upstreams.some(u => u.ping);

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
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${showPaymentDialog ? 'hidden' : ''}`}>
        <div className="bg-[#1a2632] border border-[#344d65] rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-4">Mua Proxy</h2>

          <div className="mb-4">
            <p className="text-sm text-[#93adc8] mb-2">Đã chọn: {upstreams.length} proxy</p>
            <div className="max-h-60 overflow-y-auto border border-[#344d65] rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-[#111a22] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[#93adc8] font-medium border-b border-[#344d65]">Host</th>
                    <th className="px-3 py-2 text-left text-[#93adc8] font-medium border-b border-[#344d65]">Port</th>
                    <th className="px-3 py-2 text-left text-[#93adc8] font-medium border-b border-[#344d65]">Country</th>
                    {hasState && (
                      <th className="px-3 py-2 text-left text-[#93adc8] font-medium border-b border-[#344d65]">State</th>
                    )}
                    {hasCity && (
                      <th className="px-3 py-2 text-left text-[#93adc8] font-medium border-b border-[#344d65]">City</th>
                    )}
                    {hasPing && (
                      <th className="px-3 py-2 text-right text-[#93adc8] font-medium border-b border-[#344d65]">Ping</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {upstreams.map((upstream) => (
                    <tr key={upstream.id} className="border-b border-[#344d65]/50 hover:bg-[#111a22]/50">
                      <td className="px-3 py-2 text-white font-mono">{upstream.host}</td>
                      <td className="px-3 py-2 text-white">{upstream.port}</td>
                      <td className="px-3 py-2 text-[#93adc8]">{upstream.country || '-'}</td>
                      {hasState && (
                        <td className="px-3 py-2 text-[#93adc8]">{upstream.state || '-'}</td>
                      )}
                      {hasCity && (
                        <td className="px-3 py-2 text-[#93adc8]">{upstream.city || '-'}</td>
                      )}
                      {hasPing && (
                        <td className="px-3 py-2 text-right text-[#93adc8]">
                          {upstream.ping ? `${upstream.ping}ms` : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Port Selection */}
          {upstreams.length > 0 && (
            <div className="mb-4">
              <PortSelection
                selectedPorts={selectedPorts}
                onPortsChange={setSelectedPorts}
                requiredCount={upstreams.length}
                disabled={loading}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#93adc8] mb-2">
              Thời hạn
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['24h', '7d', '30d'] as PurchaseDuration[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`p-3 rounded-lg border transition-colors ${
                    duration === dur
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-[#344d65] bg-[#111a22] text-[#93adc8] hover:border-[#2f455a]'
                  }`}
                >
                  <div className="font-semibold">{durationLabels[dur]}</div>
                  <div className="text-xs mt-1">{formatVND(durationPrices[dur])}/proxy</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 p-3 bg-[#111a22] rounded-lg border border-[#344d65]">
            <div className="flex justify-between items-center">
              <span className="text-[#93adc8]">Tổng cộng:</span>
              <span className="text-xl font-bold text-white">{formatVND(totalPrice)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#243647] hover:bg-[#344d65] text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              onClick={handlePurchase}
              className="flex-1 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={loading || selectedPorts.length !== upstreams.length}
            >
              {loading ? 'Đang xử lý...' : 'Mua ngay'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
