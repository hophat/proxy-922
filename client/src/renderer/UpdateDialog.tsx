import React, { useState, useEffect } from 'react';

interface UpdateInfo {
  hasUpdate: boolean;
  version?: string;
  platform?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  isMandatory?: boolean;
  fileSize?: number;
  checksum?: string;
  createdAt?: string;
}

interface UpdateDialogProps {
  updateInfo: UpdateInfo;
  open: boolean;
  onClose: () => void;
  onDownload: (downloadUrl: string) => Promise<void>;
  downloadProgress?: number;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  onInstall: () => Promise<void>;
  isInstalling?: boolean;
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  updateInfo,
  open,
  onClose,
  onDownload,
  downloadProgress = 0,
  isDownloading = false,
  isDownloaded = false,
  onInstall,
  isInstalling = false,
}) => {
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  if (!open) {
    return null;
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Có phiên bản mới!
            </h2>
            {!updateInfo.isMandatory && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDownloading || isInstalling}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Phiên bản mới: <span className="font-semibold">{updateInfo.version}</span>
            </p>
            {updateInfo.fileSize && (
              <p className="text-sm text-gray-500 mb-2">
                Kích thước: {formatFileSize(updateInfo.fileSize)}
              </p>
            )}
          </div>

          {updateInfo.releaseNotes && (
            <div className="mb-4">
              <button
                onClick={() => setShowReleaseNotes(!showReleaseNotes)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showReleaseNotes ? 'Ẩn' : 'Xem'} ghi chú phiên bản
              </button>
              {showReleaseNotes && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {updateInfo.releaseNotes}
                </div>
              )}
            </div>
          )}

          {updateInfo.isMandatory && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Đây là bản cập nhật bắt buộc. Bạn cần cập nhật để tiếp tục sử dụng.
              </p>
            </div>
          )}

          {isDownloading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Đang tải xuống...</span>
                <span className="text-sm font-medium text-gray-900">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {isDownloaded && !isInstalling && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                ✓ Tải xuống hoàn tất! Sẵn sàng cài đặt.
              </p>
            </div>
          )}

          {isInstalling && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                Đang cài đặt... Ứng dụng sẽ tự động khởi động lại sau khi cài đặt xong.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            {!isDownloaded && !isDownloading && (
              <>
                {!updateInfo.isMandatory && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Để sau
                  </button>
                )}
                <button
                  onClick={() => updateInfo.downloadUrl && onDownload(updateInfo.downloadUrl)}
                  disabled={!updateInfo.downloadUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tải xuống
                </button>
              </>
            )}

            {isDownloaded && !isInstalling && (
              <button
                onClick={onInstall}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Cài đặt ngay
              </button>
            )}

            {isDownloading && (
              <button
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
              >
                Đang tải...
              </button>
            )}

            {isInstalling && (
              <button
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
              >
                Đang cài đặt...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
