import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { URL } from 'url';
import * as semver from 'semver';
import { spawn } from 'child_process';

// Use same BACKEND_URL logic as main.ts for consistency
const BACKEND_URL = process.env.BACKEND_URL_DEV || process.env.BACKEND_URL || 'https://api-proxy.gulagi.com';
// const BACKEND_URL = process.env.BACKEND_URL_DEV || 'http://localhost:3300';
const CURRENT_VERSION = app.getVersion();

export interface UpdateInfo {
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

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'downloading' | 'downloaded' | 'installing' | 'error';
  progress?: number;
  error?: string;
  downloadedPath?: string;
}

let updateStatus: UpdateStatus = {
  status: 'idle',
};

// Helper function to make HTTP requests
function httpRequest(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000,
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        });
      });

      req.on('error', (err) => {
        console.error(`[Updater] Request error:`, err);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    } catch (err: any) {
      console.error(`[Updater] Failed to create request:`, err);
      reject(err);
    }
  });
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    updateStatus.status = 'checking';
    
    const platform = process.platform; // 'win32', 'darwin', 'linux'
    const url = `${BACKEND_URL}/app/version?platform=${platform}`;
    
    console.log(`[Updater] Checking for updates... Platform: ${platform}, Current version: ${CURRENT_VERSION}`);
    
    const response = await httpRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    const data = JSON.parse(response.body);
    
    if (!data.hasUpdate) {
      updateStatus.status = 'idle';
      return { hasUpdate: false };
    }

    // Compare versions
    const latestVersion = data.version;
    const hasNewVersion = semver.gt(latestVersion, CURRENT_VERSION);

    if (!hasNewVersion) {
      updateStatus.status = 'idle';
      return { hasUpdate: false };
    }

    updateStatus.status = 'idle';
    
    return {
      hasUpdate: true,
      version: data.version,
      platform: data.platform,
      downloadUrl: data.downloadUrl,
      releaseNotes: data.releaseNotes,
      isMandatory: data.isMandatory,
      fileSize: data.fileSize,
      checksum: data.checksum,
      createdAt: data.createdAt,
    };
  } catch (error: any) {
    console.error('[Updater] Error checking for updates:', error);
    updateStatus.status = 'error';
    updateStatus.error = error.message;
    throw error;
  }
}

export async function downloadUpdate(downloadUrl: string, onProgress?: (progress: number) => void): Promise<string> {
  try {
    updateStatus.status = 'downloading';
    updateStatus.progress = 0;

    const urlObj = new URL(downloadUrl);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const requestOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 300000, // 5 minutes
      };

      const req = client.request(requestOptions, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        // Create temp directory if it doesn't exist
        const tempDir = path.join(app.getPath('temp'), 'Proxy96-updates');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Determine file extension from URL or platform
        const fileExt = process.platform === 'win32' ? '.exe' : process.platform === 'darwin' ? '.dmg' : '.zip';
        const fileName = `Proxy96-Update-${Date.now()}${fileExt}`;
        const filePath = path.join(tempDir, fileName);

        const fileStream = fs.createWriteStream(filePath);

        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);

          if (totalSize > 0 && onProgress) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            updateStatus.progress = progress;
            onProgress(progress);
          }
        });

        res.on('end', () => {
          fileStream.end();
          updateStatus.status = 'downloaded';
          updateStatus.progress = 100;
          updateStatus.downloadedPath = filePath;
          console.log(`[Updater] Download completed: ${filePath}`);
          resolve(filePath);
        });

        res.on('error', (err) => {
          fileStream.close();
          fs.unlinkSync(filePath);
          reject(err);
        });
      });

      req.on('error', (err) => {
        console.error('[Updater] Download error:', err);
        updateStatus.status = 'error';
        updateStatus.error = err.message;
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        updateStatus.status = 'error';
        updateStatus.error = 'Download timeout';
        reject(new Error('Download timeout'));
      });

      req.end();
    });
  } catch (error: any) {
    console.error('[Updater] Error downloading update:', error);
    updateStatus.status = 'error';
    updateStatus.error = error.message;
    throw error;
  }
}

export async function installUpdate(filePath: string): Promise<void> {
  try {
    updateStatus.status = 'installing';

    return new Promise((resolve, reject) => {
      if (process.platform === 'win32') {
        // Windows: Run installer
        const installer = spawn(filePath, ['/S'], {
          detached: true,
          stdio: 'ignore',
        });

        installer.on('error', (err) => {
          console.error('[Updater] Installer error:', err);
          updateStatus.status = 'error';
          updateStatus.error = err.message;
          reject(err);
        });

        installer.on('close', (code) => {
          if (code === 0) {
            console.log('[Updater] Installation completed, quitting app...');
            // Quit app after a short delay to allow installer to start
            setTimeout(() => {
              app.quit();
            }, 1000);
            resolve();
          } else {
            updateStatus.status = 'error';
            updateStatus.error = `Installer exited with code ${code}`;
            reject(new Error(`Installer exited with code ${code}`));
          }
        });

        installer.unref();
      } else if (process.platform === 'darwin') {
        // macOS: Open DMG
        const open = spawn('open', [filePath], {
          detached: true,
          stdio: 'ignore',
        });

        open.on('error', (err) => {
          console.error('[Updater] Open error:', err);
          updateStatus.status = 'error';
          updateStatus.error = err.message;
          reject(err);
        });

        open.on('close', (code) => {
          if (code === 0) {
            console.log('[Updater] DMG opened, user can install manually');
            // For macOS, we just open the DMG, user installs manually
            updateStatus.status = 'downloaded';
            resolve();
          } else {
            updateStatus.status = 'error';
            updateStatus.error = `Failed to open DMG: code ${code}`;
            reject(new Error(`Failed to open DMG: code ${code}`));
          }
        });

        open.unref();
      } else {
        // Linux: Not supported for now
        reject(new Error('Auto-install not supported on Linux'));
      }
    });
  } catch (error: any) {
    console.error('[Updater] Error installing update:', error);
    updateStatus.status = 'error';
    updateStatus.error = error.message;
    throw error;
  }
}

export function getUpdateStatus(): UpdateStatus {
  return { ...updateStatus };
}

export function getCurrentVersion(): string {
  return CURRENT_VERSION;
}
