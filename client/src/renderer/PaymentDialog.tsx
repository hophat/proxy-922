import React, { useState, useEffect, useRef } from 'react';

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

interface PaymentDialogProps {
  order: PaymentOrder;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onStatusCheck: (orderCode: string) => Promise<PaymentOrder | null>;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  order,
  open,
  onClose,
  onSuccess,
  onStatusCheck,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [copied, setCopied] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // Calculate initial time remaining
    const expiredAt = new Date(order.expiredAt);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiredAt.getTime() - now.getTime()) / 1000));
    setTimeRemaining(remaining);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newValue = Math.max(0, prev - 1);
        if (newValue === 0) {
          // Order expired
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
        }
        return newValue;
      });
    }, 1000);

    // Start polling for order status
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const updatedOrder = await onStatusCheck(order.orderCode);
        if (updatedOrder && updatedOrder.status === 'paid') {
          // Payment successful
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          onSuccess();
        } else if (updatedOrder && updatedOrder.status === 'expired') {
          // Order expired
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
        }
      } catch (error) {
        console.error('Failed to check order status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [open, order, onStatusCheck, onSuccess]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!open) return null;

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-[#1a2632] border border-[#344d65] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Thanh toán</h2>
          <button
            onClick={onClose}
            className="text-[#93adc8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Status */}
        {order.status === 'paid' && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600 rounded-lg text-green-400 text-sm">
            ✅ Thanh toán thành công!
          </div>
        )}

        {order.status === 'expired' && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
            ⏰ Đơn hàng đã hết hạn
          </div>
        )}

        {/* Amount */}
        <div className="mb-4 p-4 bg-[#111a22] rounded-lg border border-[#344d65]">
          <div className="text-sm text-[#93adc8] mb-1">Số tiền cần thanh toán</div>
          <div className="text-2xl font-bold text-white">{formatAmount(order.amount)}</div>
        </div>

        {/* QR Code */}
        {order.qrCodeUrl && (
          <div className="mb-4">
            <div className="text-sm text-[#93adc8] mb-2">Quét QR code để thanh toán</div>
            <div className="bg-white p-4 rounded-lg flex justify-center">
              <img
                src={order.qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>
        )}

        {/* Bank Account Info */}
        {order.vaNumber && (
          <div className="mb-4 space-y-3">
            <div className="text-sm text-[#93adc8] mb-2">Hoặc chuyển khoản đến:</div>
            
            {/* Account Number */}
            <div className="p-3 bg-[#111a22] rounded-lg border border-[#344d65]">
              <div className="text-xs text-[#93adc8] mb-1">Số tài khoản</div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-bold text-white">{order.vaNumber}</span>
                <button
                  onClick={() => copyToClipboard(order.vaNumber!, 'va')}
                  className="ml-2 px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white rounded text-xs transition-colors"
                >
                  {copied === 'va' ? 'Đã copy' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Account Name */}
            {order.accountName && (
              <div className="p-3 bg-[#111a22] rounded-lg border border-[#344d65]">
                <div className="text-xs text-[#93adc8] mb-1">Tên tài khoản</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">{order.accountName}</span>
                  <button
                    onClick={() => copyToClipboard(order.accountName!, 'account')}
                    className="ml-2 px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white rounded text-xs transition-colors"
                  >
                    {copied === 'account' ? 'Đã copy' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Transfer Content */}
            <div className="p-3 bg-[#111a22] rounded-lg border border-[#344d65]">
              <div className="text-xs text-[#93adc8] mb-1">Nội dung chuyển khoản</div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-semibold text-white">{order.orderCode}</span>
                <button
                  onClick={() => copyToClipboard(order.orderCode, 'order')}
                  className="ml-2 px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white rounded text-xs transition-colors"
                >
                  {copied === 'order' ? 'Đã copy' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Countdown */}
        {order.status === 'pending' && timeRemaining > 0 && (
          <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-600 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-400">Thời gian còn lại:</span>
              <span className="text-lg font-mono font-bold text-yellow-400">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        )}

        {timeRemaining === 0 && order.status === 'pending' && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
            ⏰ Đơn hàng đã hết hạn
          </div>
        )}

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
          <div className="text-xs text-[#93adc8] space-y-1">
            <div>📱 <strong>Lưu ý:</strong></div>
            <div>• Vui lòng chuyển khoản đúng số tiền và nội dung như trên</div>
            <div>• Hệ thống sẽ tự động xác nhận thanh toán trong vài phút</div>
            <div>• Giữ cửa sổ này mở để nhận thông báo khi thanh toán thành công</div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[#243647] hover:bg-[#344d65] text-white rounded-lg transition-colors"
        >
          {order.status === 'paid' ? 'Đóng' : 'Đóng (thanh toán sẽ tiếp tục xử lý)'}
        </button>
      </div>
    </div>
  );
};
