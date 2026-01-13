import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { purchasesService } from '../services/purchases';
import { gatewaysService, PublicGateway } from '../services/gateways';

interface ChangeGatewayDialogProps {
  mappingId: string;
  currentGatewayIp: string;
  currentPort: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ChangeGatewayDialog: React.FC<ChangeGatewayDialogProps> = ({
  mappingId,
  currentGatewayIp,
  currentPort,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [gateways, setGateways] = useState<PublicGateway[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownInfo, setCooldownInfo] = useState<{
    canChange: boolean;
    remainingMinutes: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadGateways();
    } else {
      // Reset state when dialog closes
      setSelectedGatewayId('');
      setError(null);
      setCooldownInfo(null);
    }
  }, [open]);

  const loadGateways = async () => {
    try {
      setLoadingGateways(true);
      const gatewaysData = await gatewaysService.getGateways();
      // Filter out current gateway
      const otherGateways = gatewaysData.filter(
        (gw) => gw.ipMasked !== currentGatewayIp && gw.status === 'active',
      );
      setGateways(otherGateways);
      if (otherGateways.length > 0) {
        setSelectedGatewayId(otherGateways[0].id);
        // Check cooldown for first gateway
        checkCooldown(otherGateways[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load gateways:', err);
      setError('Không thể tải danh sách gateway. Vui lòng thử lại.');
    } finally {
      setLoadingGateways(false);
    }
  };

  const checkCooldown = async (gatewayId: string) => {
    try {
      const cooldown = await purchasesService.checkCooldown(gatewayId);
      setCooldownInfo({
        canChange: cooldown.canChange,
        remainingMinutes: cooldown.remainingMinutes,
      });
    } catch (err: any) {
      console.error('Failed to check cooldown:', err);
      // Don't show error, just allow user to try
    }
  };

  const handleGatewayChange = (gatewayId: string) => {
    setSelectedGatewayId(gatewayId);
    checkCooldown(gatewayId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedGatewayId) {
      setError('Vui lòng chọn gateway');
      setLoading(false);
      return;
    }

    if (cooldownInfo && !cooldownInfo.canChange) {
      setError(
        `Bạn phải đợi ${cooldownInfo.remainingMinutes} phút nữa mới có thể đổi gateway này.`,
      );
      setLoading(false);
      return;
    }

    try {
      await purchasesService.changePortMappingGateway(mappingId, selectedGatewayId);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to change gateway:', err);
      setError(
        err.response?.data?.message || 'Đổi gateway thất bại. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-lg shadow-xl z-50 w-full max-w-md p-6">
          <Dialog.Title className="text-xl font-bold text-white mb-4">
            Đổi Gateway IP
          </Dialog.Title>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </Dialog.Close>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-gray-700/50 rounded-lg p-4 text-sm">
              <div className="flex justify-between text-gray-400 mb-2">
                <span>Port hiện tại:</span>
                <span className="text-white font-mono">{currentPort}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Gateway hiện tại:</span>
                <span className="text-white font-mono">{currentGatewayIp}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Chọn Gateway mới:
              </label>
              {loadingGateways ? (
                <div className="text-gray-400 text-sm py-2">Đang tải gateway...</div>
              ) : gateways.length === 0 ? (
                <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-lg text-sm">
                  Không có gateway nào khả dụng
                </div>
              ) : (
                <>
                  <select
                    value={selectedGatewayId}
                    onChange={(e) => handleGatewayChange(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    {gateways.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        {gw.ipMasked} - {gw.availablePortCount} ports available
                      </option>
                    ))}
                  </select>

                  {cooldownInfo && !cooldownInfo.canChange && (
                    <div className="mt-2 bg-yellow-500/10 text-yellow-400 px-4 py-3 rounded-lg text-sm">
                      ⏱️ Bạn phải đợi {cooldownInfo.remainingMinutes} phút nữa mới có thể đổi
                      gateway này (cooldown 5 phút sau mỗi lần đổi).
                    </div>
                  )}

                  {cooldownInfo && cooldownInfo.canChange && (
                    <div className="mt-2 bg-green-500/10 text-green-400 px-4 py-3 rounded-lg text-sm">
                      ✓ Có thể đổi gateway ngay
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !selectedGatewayId ||
                  gateways.length === 0 ||
                  (cooldownInfo && !cooldownInfo.canChange)
                }
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
