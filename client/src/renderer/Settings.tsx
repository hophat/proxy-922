import React, { useState, useEffect } from 'react';

interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  type: string;
  release: string;
  cpuCount: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  localIPs: string[];
}

interface SettingsProps {
  userEmail: string;
  onLogout: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToProxies: () => void;
  onNavigateToPortForwards: () => void;
  onNavigateToPaymentHistory: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  userEmail,
  onLogout,
  onNavigateToDashboard,
  onNavigateToProxies,
  onNavigateToPortForwards,
  onNavigateToPaymentHistory,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    // Get system info from main process
    const loadSystemInfo = async () => {
      try {
        const info = await window.electronAPI?.getSystemInfo();
        if (info) {
          setSystemInfo(info);
        }
      } catch (err) {
        console.error('Failed to load system info:', err);
      }
    };
    
    loadSystemInfo();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI?.changePassword(currentPassword, newPassword);
      
      if (result?.success) {
        setSuccess(result.message || 'Đổi mật khẩu thành công');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(undefined), 5000);
      } else {
        setError(result?.error || 'Đổi mật khẩu thất bại');
      }
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setError(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
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
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors group"
                onClick={onNavigateToPaymentHistory}
              >
                <span className="text-[#93adc8] group-hover:text-white transition-colors material-symbols-outlined" style={{ fontSize: '24px' }}>receipt_long</span>
                <p className="text-[#93adc8] group-hover:text-white transition-colors text-sm font-medium leading-normal">Lịch sử thanh toán</p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#243647] cursor-pointer hover:bg-[#2f455a] transition-colors">
                <span className="text-white material-symbols-outlined" style={{ fontSize: '24px' }}>settings</span>
                <p className="text-white text-sm font-medium leading-normal">Settings</p>
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
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Settings</h2>
          </div>
        </header>

        <div className="flex flex-col w-full max-w-[800px] mx-auto p-4 md:p-6 gap-6">
          {/* User Info Card */}
          <div className="border border-[#344d65] rounded-xl bg-[#111a22] p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
              Thông tin tài khoản
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">Email:</span>
                <span className="text-white text-sm">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="border border-[#344d65] rounded-xl bg-[#111a22] p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>lock</span>
              Đổi mật khẩu
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-600/20 border border-green-600 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#93adc8]">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#344d65] bg-[#1a2632] px-4 py-3 pr-10 text-white placeholder-[#93adc8] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Nhập mật khẩu hiện tại"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93adc8] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showCurrentPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#93adc8]">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#344d65] bg-[#1a2632] px-4 py-3 pr-10 text-white placeholder-[#93adc8] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93adc8] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#93adc8]">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#344d65] bg-[#1a2632] px-4 py-3 pr-10 text-white placeholder-[#93adc8] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Nhập lại mật khẩu mới"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93adc8] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>refresh</span>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                    <span>Đổi mật khẩu</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Network Info Card */}
          <div className="border border-[#344d65] rounded-xl bg-[#111a22] p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>network_check</span>
              Thông tin mạng
            </h3>
            <div className="flex flex-col gap-3">
              {systemInfo ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">Hostname:</span>
                    <code className="text-white text-sm font-mono bg-[#1a2632] px-2 py-1 rounded">{systemInfo.hostname}</code>
                    <button
                      onClick={() => copyToClipboard(systemInfo.hostname)}
                      className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors"
                      title="Sao chép hostname"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">Platform:</span>
                    <span className="text-white text-sm">{systemInfo.platform} {systemInfo.arch}</span>
                  </div>
                  {systemInfo.localIPs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[#93adc8] text-sm font-medium">Địa chỉ IP Local:</span>
                      <div className="flex flex-col gap-2">
                        {systemInfo.localIPs.map((ip, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <code className="flex-1 text-white text-sm font-mono bg-[#1a2632] px-2 py-1 rounded">{ip}</code>
                            <button
                              onClick={() => copyToClipboard(ip)}
                              className="px-2 py-1 bg-[#243647] hover:bg-[#344d65] text-white text-xs rounded transition-colors"
                              title="Sao chép IP"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {systemInfo.localIPs.length === 0 && (
                    <div className="text-[#93adc8] text-sm">Không tìm thấy địa chỉ IP local</div>
                  )}
                </>
              ) : (
                <div className="text-[#93adc8] text-sm">Đang tải thông tin mạng...</div>
              )}
            </div>
          </div>

          {/* System Info Card */}
          <div className="border border-[#344d65] rounded-xl bg-[#111a22] p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>computer</span>
              Thông tin hệ thống
            </h3>
            <div className="flex flex-col gap-3">
              {systemInfo ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">OS:</span>
                    <span className="text-white text-sm">{systemInfo.type} {systemInfo.release}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">CPU:</span>
                    <span className="text-white text-sm">{systemInfo.cpuCount} cores</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">Memory:</span>
                    <span className="text-white text-sm">
                      {(systemInfo.totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB total,{' '}
                      {(systemInfo.freeMemory / (1024 * 1024 * 1024)).toFixed(2)} GB free
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[#93adc8] text-sm font-medium min-w-[120px]">Uptime:</span>
                    <span className="text-white text-sm">
                      {Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[#93adc8] text-sm">Đang tải thông tin hệ thống...</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
