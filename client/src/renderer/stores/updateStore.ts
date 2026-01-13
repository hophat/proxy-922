import { create } from 'zustand';

interface UpdateInfo {
  version?: string;
  platform?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  isMandatory?: boolean;
  fileSize?: number;
  checksum?: string;
  createdAt?: string;
}

interface UpdateState {
  updateInfo: UpdateInfo | null;
  showUpdateDialog: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isDownloaded: boolean;
  isInstalling: boolean;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  showDialog: () => void;
  hideDialog: () => void;
  setDownloading: (downloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setDownloaded: (downloaded: boolean) => void;
  setInstalling: (installing: boolean) => void;
  downloadUpdate: (downloadUrl: string) => Promise<void>;
  installUpdate: () => Promise<void>;
  closeDialog: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateInfo: null,
  showUpdateDialog: false,
  isDownloading: false,
  downloadProgress: 0,
  isDownloaded: false,
  isInstalling: false,

  setUpdateInfo: (info: UpdateInfo | null) => set({ updateInfo: info }),
  showDialog: () => set({ showUpdateDialog: true }),
  hideDialog: () => set({ showUpdateDialog: false }),
  setDownloading: (downloading: boolean) => set({ isDownloading: downloading }),
  setDownloadProgress: (progress: number) => set({ downloadProgress: progress }),
  setDownloaded: (downloaded: boolean) => set({ isDownloaded: downloaded }),
  setInstalling: (installing: boolean) => set({ isInstalling: installing }),

  downloadUpdate: async (downloadUrl: string) => {
    try {
      set({ isDownloading: true, downloadProgress: 0, isDownloaded: false });
      
      await window.electronAPI?.update?.downloadUpdate(downloadUrl);
      
      set({ isDownloading: false, isDownloaded: true });
    } catch (error: any) {
      console.error('[UpdateStore] Failed to download update:', error);
      set({ isDownloading: false });
      throw error;
    }
  },

  installUpdate: async () => {
    try {
      set({ isInstalling: true });
      const status = await window.electronAPI?.update?.getUpdateStatus();
      if (status?.downloadedPath) {
        await window.electronAPI?.update?.installUpdate(status.downloadedPath);
        // App will quit after installation, so we don't need to reset state
      } else {
        throw new Error('No downloaded file found');
      }
    } catch (error: any) {
      console.error('[UpdateStore] Failed to install update:', error);
      set({ isInstalling: false });
      throw error;
    }
  },

  closeDialog: () => {
    const { updateInfo } = get();
    if (!updateInfo?.isMandatory) {
      set({
        showUpdateDialog: false,
        updateInfo: null,
        isDownloading: false,
        isDownloaded: false,
        downloadProgress: 0,
      });
    }
  },
}));
