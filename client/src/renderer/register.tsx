import React, { useState, useEffect } from 'react';

interface RegisterProps {
  onRegister: (email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onVerifyOtp: (email: string, code: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onResendOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onBackToLogin: () => void;
  error?: string;
}

export const Register: React.FC<RegisterProps> = ({ onRegister, onVerifyOtp, onResendOtp, onBackToLogin, error: initialError }) => {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  // Countdown for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSuccessMessage(undefined);

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const result = await onRegister(email, password);
      if (result.success) {
        setSuccessMessage(result.message || 'OTP đã được gửi đến email của bạn');
        setStep('verify');
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        setError(result.error || 'Đăng ký thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSuccessMessage(undefined);

    if (!otpCode || otpCode.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      const result = await onVerifyOtp(email, otpCode, password);
      if (result.success) {
        setSuccessMessage(result.message || 'Đăng ký thành công! Vui lòng đăng nhập.');
        // Wait a bit then go back to login
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        setError(result.error || 'Mã OTP không hợp lệ');
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError(undefined);
    setLoading(true);
    try {
      const result = await onResendOtp(email);
      if (result.success) {
        setSuccessMessage(result.message || 'OTP đã được gửi lại');
        setResendCooldown(60);
      } else {
        setError(result.error || 'Không thể gửi lại OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(numericValue);
  };

  if (step === 'verify') {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-light via-background-light/80 to-background-light/50 dark:from-background-dark dark:via-background-dark/90 dark:to-background-dark/60"></div>
        </div>

        {/* Main Layout */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
          <div className="w-full max-w-[480px] flex flex-col gap-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/logo.png" 
                  alt="Proxy96 Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to icon if logo not found
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="material-symbols-outlined text-white text-[32px]">mail</span>';
                      parent.className = 'mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30';
                    }
                  }}
                />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">Xác thực Email</h1>
              <p className="mt-2 text-base font-normal text-slate-500 dark:text-text-muted text-center max-w-xs">
                Nhập mã OTP đã được gửi đến {email}
              </p>
            </div>

            {/* Card */}
            <div className="flex flex-col rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark shadow-2xl overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
                  {/* OTP Field */}
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-white">Mã OTP</span>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">lock</span>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => handleOtpChange(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 pr-4 text-center text-2xl font-mono tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-text-muted">Nhập mã 6 chữ số từ email của bạn</p>
                  </label>

                  {/* Error Display */}
                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                      <span className="text-sm text-red-500 font-medium">{error}</span>
                    </div>
                  )}

                  {/* Success Display */}
                  {successMessage && (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                      <span className="text-sm text-green-500 font-medium">{successMessage}</span>
                    </div>
                  )}

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-primary py-3.5 px-4 text-base font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Xác thực
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </span>
                    )}
                  </button>
                </form>

                {/* Resend OTP */}
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-text-muted mb-2">
                    Không nhận được mã?
                  </p>
                  <button
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                  </button>
                </div>

                {/* Back to Login */}
                <div className="pt-4 border-t border-gray-200 dark:border-border-dark">
                  <button
                    onClick={onBackToLogin}
                    className="w-full text-sm text-slate-500 dark:text-text-muted hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    ← Quay lại đăng nhập
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 dark:opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-light via-background-light/80 to-background-light/50 dark:from-background-dark dark:via-background-dark/90 dark:to-background-dark/60"></div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-[480px] flex flex-col gap-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/logo.png" 
                  alt="Proxy96 Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to icon if logo not found
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="material-symbols-outlined text-white text-[32px]">person_add</span>';
                      parent.className = 'mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30';
                    }
                  }}
                />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-center">Đăng Ký</h1>
              <p className="mt-2 text-base font-normal text-slate-500 dark:text-text-muted text-center max-w-xs">
                Tạo tài khoản mới để sử dụng dịch vụ
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
              <span className="text-sm font-medium text-primary">Gateway Online</span>
            </div>

            <div className="p-6 md:p-8 flex flex-col gap-6">
              <form onSubmit={handleRegister} className="flex flex-col gap-6">
                {/* Email Field */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-white">Email</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                      placeholder="your.email@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </label>

                {/* Password Field */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-white">Mật khẩu</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 pr-12 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                      placeholder="Tối thiểu 6 ký tự"
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

                {/* Confirm Password Field */}
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-white">Xác nhận mật khẩu</span>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-text-muted material-symbols-outlined text-[20px]">lock</span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-slate-50 dark:bg-[#111921] px-4 py-3 pl-11 pr-12 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 transition-all"
                      placeholder="Nhập lại mật khẩu"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-0 h-full px-4 text-slate-400 dark:text-text-muted hover:text-slate-600 dark:hover:text-white transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
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

                {/* Success Display */}
                {successMessage && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                    <span className="text-sm text-green-500 font-medium">{successMessage}</span>
                  </div>
                )}

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-primary py-3.5 px-4 text-base font-bold text-white shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background-dark h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Đăng ký
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </span>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="pt-4 border-t border-gray-200 dark:border-border-dark">
                <button
                  onClick={onBackToLogin}
                  className="w-full text-sm text-slate-500 dark:text-text-muted hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  ← Đã có tài khoản? Đăng nhập
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
