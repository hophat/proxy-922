import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { PaymentOrder, PaymentOrderStatus } from "../../types";

const PaymentsPage = () => {
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await adminService.getPayments(params);
      setPayments(data);
    } catch (error) {
      console.error("Failed to load payments:", error);
      alert("Lỗi khi tải danh sách payments");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (payment: PaymentOrder) => {
    if (!confirm(`Bạn có chắc chắn muốn đánh dấu đơn hàng ${payment.orderCode} đã thanh toán?`)) {
      return;
    }

    try {
      setProcessingId(payment.id);
      await adminService.updatePaymentStatus(payment.id, PaymentOrderStatus.PAID);
      // Reload payments để cập nhật status
      await loadPayments();
      alert("Đã đánh dấu thanh toán thành công!");
    } catch (error: any) {
      console.error("Failed to update payment status:", error);
      alert(`Lỗi khi cập nhật trạng thái: ${error.message || "Unknown error"}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && payments.length === 0) {
    return <div className="text-gray-500">Đang tải...</div>;
  }

  const filteredPayments = statusFilter === "all" 
    ? payments 
    : payments.filter((p) => p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Quản lý payment orders và yêu cầu mua</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Lọc theo trạng thái:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Pending (Chờ thanh toán)</option>
            <option value="paid">Paid (Đã thanh toán)</option>
            <option value="expired">Expired (Hết hạn)</option>
            <option value="cancelled">Cancelled (Đã hủy)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                  Không có payment orders nào
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.orderCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.userEmail || payment.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.amount.toLocaleString()} VNĐ
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : payment.status === "expired"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.purchaseType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs">
                      {payment.purchaseType === "upstream" && payment.purchaseData?.upstreamIds ? (
                        <div>
                          <div className="font-medium">Upstream IDs:</div>
                          <div className="text-xs mt-1">
                            {Array.isArray(payment.purchaseData.upstreamIds)
                              ? payment.purchaseData.upstreamIds.length
                              : 0}{" "}
                            upstream(s)
                          </div>
                          {payment.purchaseData.duration && (
                            <div className="text-xs">Duration: {payment.purchaseData.duration}</div>
                          )}
                        </div>
                      ) : payment.purchaseType === "port" ? (
                        <div>
                          <div className="text-xs">Port purchase</div>
                          {payment.purchaseData.portCount && (
                            <div className="text-xs">Ports: {payment.purchaseData.portCount}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs">-</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {payment.status === "pending" && (
                      <button
                        onClick={() => handleMarkAsPaid(payment)}
                        disabled={processingId === payment.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          processingId === payment.id
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {processingId === payment.id ? "Đang xử lý..." : "Đánh dấu đã thanh toán"}
                      </button>
                    )}
                    {payment.status === "paid" && payment.paidAt && (
                      <div className="text-xs text-gray-500">
                        Đã thanh toán: {new Date(payment.paidAt).toLocaleString("vi-VN")}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;
