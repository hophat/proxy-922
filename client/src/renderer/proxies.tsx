import React, { useState, useEffect } from 'react';
import { UpstreamPurchaseDialog } from './UpstreamPurchaseDialog';

interface PublicUpstream {
  id: string;
  host: string; // IP đã được mask (ví dụ: 192.168.***.***)
  port: number;
  country?: string;
  state?: string;
  city?: string;
  ping?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProxiesProps {
  userEmail: string;
  onLogout: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToPortForwards: () => void;
  onNavigateToPaymentHistory: () => void;
  onNavigateToSettings: () => void;
}

export const Proxies: React.FC<ProxiesProps> = ({ userEmail, onLogout, onNavigateToDashboard, onNavigateToPortForwards, onNavigateToPaymentHistory, onNavigateToSettings }) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const [upstreams, setUpstreams] = useState<PublicUpstream[]>([]);
  const [displayedUpstreams, setDisplayedUpstreams] = useState<PublicUpstream[]>([]);
  const [selectedUpstreams, setSelectedUpstreams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 20 items per page for list view

  useEffect(() => {
    loadUpstreams();
  }, []);

  useEffect(() => {
    // Update displayed upstreams when page changes
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedUpstreams(upstreams.slice(startIndex, endIndex));
  }, [upstreams, currentPage]);

  const loadUpstreams = async (randomize: boolean = false) => {
    try {
      setLoading(true);
      const data = await window.electronAPI?.upstreams.getAvailable();
      if (data) {
        let processedData = [...data];
        if (randomize) {
          // Shuffle array to randomize order
          for (let i = processedData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [processedData[i], processedData[j]] = [processedData[j], processedData[i]];
          }
        }
        setUpstreams(processedData);
        setCurrentPage(1); // Reset to first page
      }
    } catch (err) {
      console.error('Failed to load upstreams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpstream = (upstreamId: string) => {
    const newSelected = new Set(selectedUpstreams);
    if (newSelected.has(upstreamId)) {
      newSelected.delete(upstreamId);
    } else {
      newSelected.add(upstreamId);
    }
    setSelectedUpstreams(newSelected);
  };

  const handleBuyNow = () => {
    if (selectedUpstreams.size === 0) {
      alert('Vui lòng chọn ít nhất một proxy');
      return;
    }
    setShowPurchaseDialog(true);
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseDialog(false);
    setSelectedUpstreams(new Set());
    loadUpstreams();
  };

  const selectedUpstreamsList = upstreams.filter((u) => selectedUpstreams.has(u.id));

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden flex h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-64 flex-col border-r border-[#243647] bg-[#111a22] shrink-0`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            {/* Brand / Profile Snippet */}
            <div className="flex gap-3 items-center px-2 py-2">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-primary to-purple-600"></div>
              <div className="flex flex-col">
                <h1 className="text-white text-base font-bold leading-normal">
                  ProxyManager
                </h1>
                <p className="text-[#93adc8] text-xs font-normal leading-normal">
                  v2.4.0
                </p>
              </div>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col gap-2 mt-4">
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToDashboard}
              >
                <span
                  className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  dashboard
                </span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">
                  Dashboard
                </p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#243647] cursor-pointer hover:bg-[#2f455a] transition-colors">
                <span
                  className="text-white material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  router
                </span>
                <p className="text-white text-sm font-medium leading-normal">
                  Proxies
                </p>
              </div>
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPortForwards}
              >
                <span
                  className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  shopping_bag
                </span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">
                  Đã Mua
                </p>
              </div>
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPaymentHistory}
              >
                <span
                  className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  receipt_long
                </span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">
                  Lịch sử thanh toán
                </p>
              </div>
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={() => onNavigateToSettings?.()}
              >
                <span
                  className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined"
                  style={{ fontSize: '24px' }}
                >
                  settings
                </span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">
                  Settings
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors text-[#93adc8] hover:text-red-400"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            <p className="text-sm font-medium leading-normal">Log Out</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col h-full relative overflow-y-auto bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#243647] bg-[#111a22]/95 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-4 text-white">
            <button
              className="md:hidden text-white cursor-pointer material-symbols-outlined"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              menu
            </button>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              Browse Proxies
            </h2>
          </div>
          <div className="flex flex-1 justify-end gap-4 items-center">
            <div className="flex gap-2">
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#243647] hover:bg-[#2f455a] text-white transition-colors">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px' }}
                >
                  shopping_cart
                </span>
              </button>
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#243647] hover:bg-[#2f455a] text-white transition-colors">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px' }}
                >
                  notifications
                </span>
              </button>
              <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#243647] hover:bg-[#2f455a] text-white transition-colors">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px' }}
                >
                  person
                </span>
              </button>
            </div>
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border-2 border-[#243647] bg-gradient-to-br from-primary to-purple-600"
              title={userEmail}
            ></div>
          </div>
        </header>

        <div className="flex flex-col w-full max-w-[1200px] mx-auto p-4 md:p-6 gap-6">
          {/* Hero Section */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center rounded-xl p-6 border border-[#344d65] bg-gradient-to-r from-[#1a2632] to-[#111a22] shadow-sm">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-white">
                Mua Proxy SOCKS5
              </h1>
              <p className="text-[#93adc8] text-sm max-w-xl">
                Chọn và mua proxy SOCKS5 từ danh sách có sẵn. IP đã được mask một nửa để bảo mật.
              </p>
            </div>
            <button
              onClick={() => loadUpstreams(true)}
              className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-[#243647] hover:bg-[#344d65] text-white text-sm font-bold rounded-lg transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '20px' }}
              >
                refresh
              </span>
              <span>Làm mới</span>
            </button>
          </div>

          {/* Proxies List */}
          {loading ? (
            <div className="text-center py-16 text-[#93adc8]">Đang tải...</div>
          ) : upstreams.length === 0 ? (
            <div className="text-center py-16 text-[#93adc8]">
              Không có proxy nào khả dụng
            </div>
          ) : (
            <>
              <div className="border border-[#344d65] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#111a22] sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedUpstreams.size === displayedUpstreams.length && displayedUpstreams.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = new Set(displayedUpstreams.map(u => u.id));
                              setSelectedUpstreams(new Set([...selectedUpstreams, ...allIds]));
                            } else {
                              const displayedIds = new Set(displayedUpstreams.map(u => u.id));
                              setSelectedUpstreams(new Set([...selectedUpstreams].filter(id => !displayedIds.has(id))));
                            }
                          }}
                          className="w-4 h-4 text-primary bg-[#111a22] border-[#344d65] rounded cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Host:Port</th>
                      <th className="px-4 py-3 text-left text-[#93adc8] font-medium">Country</th>
                      <th className="px-4 py-3 text-left text-[#93adc8] font-medium">State</th>
                      <th className="px-4 py-3 text-left text-[#93adc8] font-medium">City</th>
                      <th className="px-4 py-3 text-right text-[#93adc8] font-medium">Ping</th>
                      <th className="px-4 py-3 text-center text-[#93adc8] font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUpstreams.map((upstream) => {
                      const selected = selectedUpstreams.has(upstream.id);
                      return (
                        <tr
                          key={upstream.id}
                          className={`border-b border-[#344d65]/50 cursor-pointer transition-colors ${
                            selected
                              ? 'bg-primary/10 hover:bg-primary/15'
                              : 'hover:bg-[#1a2632]/50'
                          }`}
                          onClick={() => handleToggleUpstream(upstream.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => handleToggleUpstream(upstream.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-primary bg-[#111a22] border-[#344d65] rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-white font-mono font-semibold">
                              {upstream.host}:{upstream.port}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#93adc8]">
                            {upstream.country || '-'}
                          </td>
                          <td className="px-4 py-3 text-[#93adc8]">
                            {upstream.state || '-'}
                          </td>
                          <td className="px-4 py-3 text-[#93adc8]">
                            {upstream.city || '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {upstream.ping !== null && upstream.ping !== undefined ? (
                              <span
                                className={`text-xs font-medium ${
                                  upstream.ping < 100
                                    ? 'text-green-400'
                                    : upstream.ping < 200
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {upstream.ping}ms
                              </span>
                            ) : (
                              <span className="text-[#93adc8]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 text-xs rounded-full inline-block ${
                                upstream.status === 'available'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}
                            >
                              {upstream.status === 'available' ? 'Có sẵn' : upstream.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {upstreams.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-6 p-4 bg-[#1a2632]/50 border border-[#344d65] rounded-lg">
                  <span className="text-sm text-[#93adc8]">
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, upstreams.length)} trong tổng {upstreams.length} proxy
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center justify-center size-8 rounded-lg bg-[#243647] hover:bg-[#344d65] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px' }}
                      >
                        chevron_left
                      </span>
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.ceil(upstreams.length / itemsPerPage) }).map((_, i) => {
                        const pageNum = i + 1;
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === Math.ceil(upstreams.length / itemsPerPage) ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              className={`flex items-center justify-center size-8 rounded-lg transition-colors text-xs font-medium ${
                                currentPage === pageNum
                                  ? 'bg-primary text-white'
                                  : 'bg-[#243647] hover:bg-[#344d65] text-white'
                              }`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          pageNum === currentPage - 2 ||
                          pageNum === currentPage + 2
                        ) {
                          return (
                            <span key={pageNum} className="px-2 text-[#93adc8]">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      className="flex items-center justify-center size-8 rounded-lg bg-[#243647] hover:bg-[#344d65] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={currentPage >= Math.ceil(upstreams.length / itemsPerPage)}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px' }}
                      >
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Buy Button */}
          {selectedUpstreams.size > 0 && (
            <div className="sticky bottom-0 bg-[#111a22] border-t border-[#344d65] p-4 -mx-4 md:-mx-6">
              <div className="flex items-center justify-between max-w-[1200px] mx-auto">
                <span className="text-white">
                  Đã chọn: <strong>{selectedUpstreams.size}</strong> proxy
                </span>
                <button
                  onClick={handleBuyNow}
                  className="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Mua ngay ({selectedUpstreams.size})
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <UpstreamPurchaseDialog
        upstreams={selectedUpstreamsList}
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        onSuccess={handlePurchaseSuccess}
        onClose={() => setShowPurchaseDialog(false)}
      />
    </div>
  );
};

