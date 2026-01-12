import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rotatingProxiesService, RotatingProxyPackage, RotationInterval } from '../services/rotating-proxies';
import { RotatingProxyCard } from '../components/RotatingProxyCard';
import { RotatingProxyPurchaseDialog } from '../components/RotatingProxyPurchaseDialog';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<RotatingProxyPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RotatingProxyPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Tạm thời tạo packages mặc định nếu API chưa có
      try {
        const packagesData = await rotatingProxiesService.getPackages();
        setPackages(packagesData);
      } catch (error) {
        // Fallback: tạo packages mặc định
        setPackages([
          {
            id: '1',
            rotationInterval: RotationInterval.MINUTES_5,
            price: 10,
            description: 'IP xoay mỗi 5 phút',
          },
          {
            id: '2',
            rotationInterval: RotationInterval.MINUTES_15,
            price: 15,
            description: 'IP xoay mỗi 15 phút',
          },
          {
            id: '3',
            rotationInterval: RotationInterval.MINUTES_60,
            price: 20,
            description: 'IP xoay mỗi 60 phút',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: RotatingProxyPackage) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSelectedPackage(pkg);
    setShowPurchaseDialog(true);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    setSelectedPackage(null);
    navigate('/purchases');
  };

  const handleClosePurchaseDialog = () => {
    setShowPurchaseDialog(false);
    setSelectedPackage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-400">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section - Proxy Xoay */}
      <div className="mb-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-8 border border-blue-500/30">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-white mb-3">
            Proxy Xoay SOCKS5
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Proxy xoay IP tự động với domain cố định và API key. Không cần cấu hình IP, chỉ cần domain và API key để kết nối.
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>IP xoay tự động (5p, 15p, 60p)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Kết nối qua Domain & API Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Không giới hạn băng thông</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {packages.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Tổng số gói</div>
            <div className="text-2xl font-bold text-white">{packages.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Giá thấp nhất</div>
            <div className="text-2xl font-bold text-green-400">
              ${Math.min(...packages.map(p => p.price))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Giá cao nhất</div>
            <div className="text-2xl font-bold text-blue-400">
              ${Math.max(...packages.map(p => p.price))}
            </div>
          </div>
        </div>
      )}

      {/* Danh sách Packages */}
      <div className="mb-12">
        {packages.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-300 mb-2">Hiện tại không có gói proxy nào khả dụng</p>
            <p className="text-gray-500">Vui lòng quay lại sau hoặc liên hệ admin để được hỗ trợ.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Chọn gói proxy xoay ({packages.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <RotatingProxyCard
                  key={pkg.id}
                  package={pkg}
                  onSelect={handleSelectPackage}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedPackage && (
        <RotatingProxyPurchaseDialog
          package={selectedPackage}
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          onSuccess={handlePurchaseSuccess}
          onClose={handleClosePurchaseDialog}
        />
      )}
    </div>
  );
};
