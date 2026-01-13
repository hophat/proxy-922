import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { AppVersion } from "../../types";
import { Plus, Edit, X, Download } from "lucide-react";

const AppVersionsPage = () => {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AppVersion | null>(null);
  const [formData, setFormData] = useState({
    version: "",
    platform: "win32",
    downloadUrl: "",
    releaseNotes: "",
    isMandatory: false,
    fileSize: "",
    checksum: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      const data = await adminService.getAppVersions();
      setVersions(data);
    } catch (error) {
      console.error("Failed to load app versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingVersion(null);
    setFormData({
      version: "",
      platform: "win32",
      downloadUrl: "",
      releaseNotes: "",
      isMandatory: false,
      fileSize: "",
      checksum: "",
    });
    setShowModal(true);
  };

  const handleEdit = (version: AppVersion) => {
    setEditingVersion(version);
    setFormData({
      version: version.version,
      platform: version.platform,
      downloadUrl: version.downloadUrl,
      releaseNotes: version.releaseNotes || "",
      isMandatory: version.isMandatory,
      fileSize: version.fileSize?.toString() || "",
      checksum: version.checksum || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.version || !formData.platform || !formData.downloadUrl) {
      alert("Vui lòng điền đầy đủ thông tin (version, platform, downloadUrl)");
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        version: formData.version,
        platform: formData.platform,
        downloadUrl: formData.downloadUrl,
        releaseNotes: formData.releaseNotes || undefined,
        isMandatory: formData.isMandatory,
      };

      if (formData.fileSize) {
        const fileSize = parseInt(formData.fileSize, 10);
        if (!isNaN(fileSize) && fileSize > 0) {
          data.fileSize = fileSize;
        }
      }

      if (formData.checksum) {
        data.checksum = formData.checksum;
      }

      if (editingVersion) {
        await adminService.updateAppVersion(editingVersion.id, data);
      } else {
        await adminService.createAppVersion(data);
      }
      await loadVersions();
      setShowModal(false);
      setFormData({
        version: "",
        platform: "win32",
        downloadUrl: "",
        releaseNotes: "",
        isMandatory: false,
        fileSize: "",
        checksum: "",
      });
      setEditingVersion(null);
    } catch (error: any) {
      alert(`Lỗi: ${error.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa version này?")) {
      return;
    }

    try {
      await adminService.deleteAppVersion(id);
      await loadVersions();
    } catch (error: any) {
      alert(`Lỗi: ${error.message || "Unknown error"}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      version: "",
      platform: "win32",
      downloadUrl: "",
      releaseNotes: "",
      isMandatory: false,
      fileSize: "",
      checksum: "",
    });
    setEditingVersion(null);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getPlatformLabel = (platform: string): string => {
    const labels: Record<string, string> = {
      win32: "Windows",
      darwin: "macOS",
      linux: "Linux",
    };
    return labels[platform] || platform;
  };

  if (loading) {
    return <div className="text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Versions</h1>
          <p className="text-gray-600 mt-1">Quản lý phiên bản ứng dụng client</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm Version
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Download URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mandatory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {versions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Chưa có version nào
                </td>
              </tr>
            ) : (
              versions.map((version) => (
                <tr key={version.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {version.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPlatformLabel(version.platform)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <a
                      href={version.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      <span className="max-w-xs truncate">{version.downloadUrl}</span>
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(version.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        version.isMandatory
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {version.isMandatory ? "Bắt buộc" : "Tùy chọn"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(version)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(version.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingVersion ? "Chỉnh sửa Version" : "Thêm Version Mới"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="win32">Windows</option>
                    <option value="darwin">macOS</option>
                    <option value="linux">Linux</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    placeholder="https://s3.amazonaws.com/bucket/file.exe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Release Notes
                  </label>
                  <textarea
                    value={formData.releaseNotes}
                    onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
                    placeholder="Các thay đổi trong phiên bản này..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Size (bytes)
                    </label>
                    <input
                      type="number"
                      value={formData.fileSize}
                      onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                      placeholder="50000000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Checksum (SHA256)
                    </label>
                    <input
                      type="text"
                      value={formData.checksum}
                      onChange={(e) => setFormData({ ...formData, checksum: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={formData.isMandatory}
                    onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isMandatory" className="ml-2 text-sm font-medium text-gray-700">
                    Bắt buộc cập nhật (Mandatory Update)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppVersionsPage;
