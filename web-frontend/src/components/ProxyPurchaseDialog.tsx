import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { PublicProxy } from '../services/proxies';
import { useNavigate } from 'react-router-dom';

interface ProxyPurchaseDialogProps {
  proxy: PublicProxy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export const ProxyPurchaseDialog: React.FC<ProxyPurchaseDialogProps> = ({
  proxy,
  open,
  onOpenChange,
  onClose,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'credentials'>('info');

  useEffect(() => {
    if (!open) {
      setStep('info');
    }
  }, [open]);

  const handlePurchase = () => {
    // Chuyển sang bước hiển thị thông tin proxy
    setStep('credentials');
  };

  const handleViewGuide = () => {
    onClose();
    navigate('/proxy-guide');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </Dialog.Close>

          {step === 'info' ? (
            <>
              <Dialog.Title className="text-xl font-bold text-white mb-4">
                Thông tin Proxy SOCKS5
              </Dialog.Title>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Địa chỉ Proxy:</span>
                    <span className="text-white font-mono font-semibold">
                      {proxy.host}:{proxy.port}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Trạng thái:</span>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                      {proxy.status === 'active' ? 'Hoạt động' : 'Không khả dụng'}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Thông tin quan trọng:</h3>
                  <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                    <li>Proxy này là SOCKS5 proxy</li>
                    <li>Cần username và password để kết nối</li>
                    <li>Vui lòng xem hướng dẫn sử dụng bên dưới</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePurchase}
                  disabled={proxy.status !== 'active'}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Xem thông tin kết nối
                </button>
                <button
                  onClick={handleViewGuide}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Hướng dẫn sử dụng
                </button>
              </div>
            </>
          ) : (
            <>
              <Dialog.Title className="text-xl font-bold text-white mb-4">
                Thông tin kết nối Proxy
              </Dialog.Title>

              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Địa chỉ Proxy:</label>
                      <div className="bg-gray-900 p-3 rounded font-mono text-white break-all">
                        {proxy.host}:{proxy.port}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Loại Proxy:</label>
                      <div className="bg-gray-900 p-3 rounded font-mono text-white">
                        SOCKS5
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-sm text-yellow-400">
                        ⚠️ Lưu ý: Username và password của proxy sẽ được cung cấp sau khi thanh toán hoặc liên hệ admin.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-2">Cách sử dụng:</h3>
                  <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                    <li>Copy địa chỉ proxy: <code className="bg-gray-900 px-2 py-1 rounded">{proxy.host}:{proxy.port}</code></li>
                    <li>Cấu hình trong ứng dụng của bạn (browser, ứng dụng, script...)</li>
                    <li>Nhập username và password khi được yêu cầu</li>
                    <li>Kiểm tra kết nối</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setStep('info')}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleViewGuide}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Xem hướng dẫn chi tiết
                  </button>
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
