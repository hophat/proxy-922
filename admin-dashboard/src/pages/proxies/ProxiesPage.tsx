import { useEffect, useState } from "react";
import { adminService } from "../../services/admin";
import { Proxy, ProxyStatus } from "../../types";
import { Upload, X } from "lucide-react";

const ProxiesPage = () => {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    loadProxies();
  }, []);

  const loadProxies = async () => {
    try {
      const data = await adminService.getProxies();
      setProxies(data);
    } catch (error) {
      console.error("Failed to load proxies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportContent(content);
      setShowImportModal(true);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      alert("Nội dung file không được để trống");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await adminService.importProxies(importContent);
      setImportResult(result);
      if (result.imported > 0) {
        // Reload proxies list
        await loadProxies();
      }
    } catch (error: any) {
      alert(`Lỗi khi import: ${error.message || "Unknown error"}`);
    } finally {
      setImporting(false);
    }
  };

  const handleCloseModal = () => {
    setShowImportModal(false);
    setImportContent("");
    setImportResult(null);
  };

  const getStatusColor = (status: ProxyStatus) => {
    switch (status) {
      case ProxyStatus.ACTIVE:
        return "bg-green-100 text-green-800";
      case ProxyStatus.DEAD:
        return "bg-red-100 text-red-800";
      case ProxyStatus.DISABLED:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proxies</h1>
          <p className="text-gray-600 mt-1">Quản lý proxies</p>
        </div>
        <div className="flex gap-3">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 mr-2" />
            Import từ file
            <input
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Host
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Port
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Failures
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Check
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {proxies.map((proxy) => (
              <tr key={proxy.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {proxy.host}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {proxy.port}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      proxy.status
                    )}`}
                  >
                    {proxy.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {proxy.consecutiveFailures}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {proxy.lastCheck
                    ? new Date(proxy.lastCheck).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Import Proxies</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {importResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      Import thành công: {importResult.imported} proxies
                    </p>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 font-medium mb-2">
                        Lỗi ({importResult.errors.length}):
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700 max-h-48 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={handleCloseModal}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nội dung file (Format: IP:PORT:USERNAME:PASSWORD, mỗi dòng một proxy)
                    </label>
                    <textarea
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="191.96.117.155:6910:khanhbapcai:khanh1995&#10;191.101.25.115:6512:khanhbapcai:khanh1995&#10;..."
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {importContent.split('\n').filter((l) => l.trim()).length} dòng
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleImport}
                      disabled={importing || !importContent.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {importing ? "Đang import..." : "Import"}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProxiesPage;
