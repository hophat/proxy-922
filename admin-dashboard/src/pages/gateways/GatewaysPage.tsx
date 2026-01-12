import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { Gateway } from "../../types";
import { Plus, Edit, X } from "lucide-react";

const GatewaysPage = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);
  const [formData, setFormData] = useState({
    ip: "",
    portRangeStart: "",
    portRangeEnd: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      const data = await adminService.getGateways();
      setGateways(data);
    } catch (error) {
      console.error("Failed to load gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingGateway(null);
    setFormData({
      ip: "",
      portRangeStart: "",
      portRangeEnd: "",
    });
    setShowModal(true);
  };

  const handleEdit = (gateway: Gateway) => {
    setEditingGateway(gateway);
    setFormData({
      ip: gateway.ip,
      portRangeStart: gateway.portRangeStart.toString(),
      portRangeEnd: gateway.portRangeEnd.toString(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.ip || !formData.portRangeStart || !formData.portRangeEnd) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const portStart = parseInt(formData.portRangeStart, 10);
    const portEnd = parseInt(formData.portRangeEnd, 10);

    if (isNaN(portStart) || isNaN(portEnd) || portStart < 1 || portEnd < 1 || portStart > 65535 || portEnd > 65535) {
      alert("Port phải là số từ 1 đến 65535");
      return;
    }

    if (portStart > portEnd) {
      alert("Port Range Start phải nhỏ hơn hoặc bằng Port Range End");
      return;
    }

    setSaving(true);
    try {
      if (editingGateway) {
        await adminService.updateGateway(editingGateway.id, {
          ip: formData.ip,
          portRangeStart: portStart,
          portRangeEnd: portEnd,
        });
      } else {
        await adminService.createGateway({
          ip: formData.ip,
          portRangeStart: portStart,
          portRangeEnd: portEnd,
        });
      }
      await loadGateways();
      setShowModal(false);
      setFormData({ ip: "", portRangeStart: "", portRangeEnd: "" });
      setEditingGateway(null);
    } catch (error: any) {
      alert(`Lỗi: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ ip: "", portRangeStart: "", portRangeEnd: "" });
    setEditingGateway(null);
  };

  if (loading) {
    return <div className="text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gateways</h1>
          <p className="text-gray-600 mt-1">Quản lý gateways</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Gateway
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Port Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available Ports
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
            {gateways.map((gateway) => (
              <tr key={gateway.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {gateway.ip}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {gateway.portRangeStart} - {gateway.portRangeEnd}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {gateway.availablePortCount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      gateway.status === "active"
                        ? "bg-green-100 text-green-800"
                        : gateway.status === "maintenance"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {gateway.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(gateway.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(gateway)}
                    className="text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingGateway ? "Edit Gateway" : "Add Gateway"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address *
                </label>
                <input
                  type="text"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="192.168.1.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port Range Start *
                </label>
                <input
                  type="number"
                  value={formData.portRangeStart}
                  onChange={(e) =>
                    setFormData({ ...formData, portRangeStart: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="10000"
                  min="1"
                  max="65535"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port Range End *
                </label>
                <input
                  type="number"
                  value={formData.portRangeEnd}
                  onChange={(e) =>
                    setFormData({ ...formData, portRangeEnd: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="20000"
                  min="1"
                  max="65535"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Đang lưu..." : editingGateway ? "Cập nhật" : "Thêm mới"}
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewaysPage;
