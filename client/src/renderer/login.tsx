import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister?: () => void;
  error?: string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        {/* Abstract network/map background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-20"></div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background-light via-background-light/80 to-background-light/50 dark:from-background-dark dark:via-background-dark/90 dark:to-background-dark/60"></div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-[480px] flex flex-col gap-6">
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center pb-2">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-white text-[32px]">shield_lock</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">ProxyControl</h1>
            <p className="mt-2 text-base font-normal text-slate-500 dark:text-text-muted text-center max-w-xs">
              Truy cập an toàn vào hệ thống mạng phân tán của bạn
            </p>
          </div>

          {/* Card */}
          <div className="flex flex-col rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark shadow-2xl overflow-hidden">
            {/* Status Bar */}
            <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </div>
              <span className="text-sm font-medium text-primary">Gateway Trực Tuyến</span>
              <div className="ml-auto text-xs font-mono text-primary/70">US-EAST-1</div>
            </div>

            <div className="p-6 md:p-8 flex flex-col gap-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Username Field */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-white">Email hoặc API Key</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">person</span>
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                      placeholder="Nhập email của bạn"
                      required
                      disabled={loading}
                    />
                  </div>
                </label>

                {/* Password Field */}
                <label className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Mật khẩu</span>
                    <a className="text-xs font-medium text-primary hover:text-primary/80 transition-colors" href="#">Quên mật khẩu?</a>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 pr-12 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                      placeholder="Nhập mật khẩu của bạn"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-4 text-slate-400 dark:text-text-muted hover:text-slate-600 dark:hover:text-white transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </label>

                {/* Error Display */}
                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                    <span className="text-sm text-red-500 font-medium">{error}</span>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-primary py-3.5 px-4 text-base font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Đăng nhập
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-[#111921]/50 border-t border-gray-200 dark:border-border-dark p-4">
              {onRegister && (
                <div className="text-center mb-3">
                  <p className="text-sm text-slate-500 dark:text-text-muted mb-2">
                    Chưa có tài khoản?
                  </p>
                  <button
                    onClick={onRegister}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Đăng ký ngay
                  </button>
                </div>
              )}
              <div className="text-center pt-3 border-t border-gray-200 dark:border-border-dark">
                <p className="text-sm text-slate-500 dark:text-text-muted">
                  Cần trợ giúp? <a className="font-medium text-primary hover:underline" href="#">Liên hệ hỗ trợ</a>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Links */}
          <div className="flex justify-center gap-6 text-sm text-slate-400 dark:text-slate-600">
            <a className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors" href="#">Chính sách bảo mật</a>
            <a className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors" href="#">Điều khoản dịch vụ</a>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">language</span> Tiếng Việt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
