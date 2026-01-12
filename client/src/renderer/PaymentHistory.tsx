import React, { useState, useEffect } from 'react';

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

interface PaymentHistoryProps {
  userEmail: string;
  onLogout: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToProxies: () => void;
  onNavigateToPortForwards: () => void;
  onNavigateToSettings: () => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  userEmail,
  onLogout,
  onNavigateToDashboard,
  onNavigateToProxies,
  onNavigateToPortForwards,
  onNavigateToSettings,
}) => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const data = await window.electronAPI?.payments.getOrders();
      if (data) {
        setOrders(data);
      }
    } catch (err: any) {
      console.error('Failed to load payment orders:', err);
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // Refresh every 30 seconds to check for status updates
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: {
        className: 'bg-green-600/20 text-green-400 border-green-600',
        label: 'Đã thanh toán',
        icon: 'check_circle',
      },
      pending: {
        className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600',
        label: 'Chờ thanh toán',
        icon: 'schedule',
      },
      expired: {
        className: 'bg-red-600/20 text-red-400 border-red-600',
        label: 'Hết hạn',
        icon: 'cancel',
      },
      cancelled: {
        className: 'bg-gray-600/20 text-gray-400 border-gray-600',
        label: 'Đã hủy',
        icon: 'block',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 border ${config.className}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
          {config.icon}
        </span>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[#243647] bg-[#111a22] shrink-0">
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center px-2 py-2">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-primary to-purple-600"></div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-normal">ProxyManager</h1>
                <p className="text-[#93adc8] text-xs font-normal leading-normal">v2.4.0</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToDashboard}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>dashboard</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Dashboard</p>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToProxies}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>router</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Proxies</p>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPortForwards}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>shopping_bag</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Đã Mua</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#243647] cursor-pointer hover:bg-[#2f455a] transition-colors">
                <span className="text-white material-symbols-outlined" style={{ fontSize: '24px' }}>receipt_long</span>
                <p className="text-white text-sm font-medium leading-normal">Lịch sử thanh toán</p>
              </div>
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={() => onNavigateToSettings?.()}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Settings</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors text-[#93adc8] hover:text-red-400" onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Log Out</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-4 text-white">
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Lịch sử thanh toán</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOrders}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#243647] hover:bg-[#344d65] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              Làm mới
            </button>
          </div>
        </header>

        <div className="flex flex-col w-full max-w-[1200px] mx-auto p-4 md:p-6 gap-6">
          {error && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-[#93adc8] py-8">Đang tải lịch sử thanh toán...</div>
          ) : orders.length === 0 ? (
            <div className="text-center text-[#93adc8] py-8">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
                receipt_long
              </span>
              <p>Chưa có lịch sử thanh toán nào</p>
            </div>
          ) : (
            <div className="border border-[#344d65] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#111a22] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Mã đơn hàng</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Số tiền</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Ngày tạo</th>
                    <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Hết hạn</th>
                    <th className="px-4 py-3 text-center text-[#93adc8] font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#344d65]/50 hover:bg-[#1a2632]/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono font-semibold">{order.orderCode}</code>
                          <button
                            onClick={() => copyToClipboard(order.orderCode)}
                            className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors"
                            title="Sao chép mã đơn hàng"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{formatAmount(order.amount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#93adc8] text-xs">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${
                          order.status === 'expired' ? 'text-red-400' : 
                          order.status === 'paid' ? 'text-green-400' : 
                          'text-[#93adc8]'
                        }`}>
                          {formatDate(order.expiredAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {order.status === 'pending' && order.qrCodeUrl && (
                            <button
                              onClick={() => {
                                // Open QR code in new window or show modal
                                window.open(order.qrCodeUrl || '', '_blank');
                              }}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary hover:bg-blue-600 text-white text-xs font-medium rounded transition-colors"
                              title="Xem QR code"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>qr_code</span>
                              QR Code
                            </button>
                          )}
                          {order.vaNumber && (
                            <button
                              onClick={() => copyToClipboard(order.vaNumber || '')}
                              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#243647] hover:bg-[#344d65] text-white text-xs font-medium rounded transition-colors"
                              title="Sao chép số tài khoản"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_balance</span>
                              STK
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Card */}
          {orders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2 rounded-xl p-4 border border-[#344d65] bg-[#1a2632]">
                <p className="text-[#93adc8] text-xs font-medium uppercase tracking-wider">Tổng đơn hàng</p>
                <p className="text-white text-2xl font-bold">{orders.length}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-4 border border-[#344d65] bg-[#1a2632]">
                <p className="text-[#93adc8] text-xs font-medium uppercase tracking-wider">Đã thanh toán</p>
                <p className="text-green-400 text-2xl font-bold">
                  {orders.filter(o => o.status === 'paid').length}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-4 border border-[#344d65] bg-[#1a2632]">
                <p className="text-[#93adc8] text-xs font-medium uppercase tracking-wider">Chờ thanh toán</p>
                <p className="text-yellow-400 text-2xl font-bold">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-4 border border-[#344d65] bg-[#1a2632]">
                <p className="text-[#93adc8] text-xs font-medium uppercase tracking-wider">Tổng tiền đã thanh toán</p>
                <p className="text-white text-2xl font-bold">
                  {formatAmount(orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0))}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
