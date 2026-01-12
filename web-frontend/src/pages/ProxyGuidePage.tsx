import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ProxyGuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4"
        >
          ← Quay lại trang chủ
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">
          Hướng dẫn sử dụng Proxy SOCKS5
        </h1>
        <p className="text-gray-400">
          Hướng dẫn chi tiết cách cấu hình và sử dụng Proxy SOCKS5
        </p>
      </div>

      <div className="space-y-6">
        {/* Giới thiệu */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Giới thiệu</h2>
          <p className="text-gray-300 mb-4">
            SOCKS5 là một giao thức proxy phổ biến cho phép bạn định tuyến lưu lượng mạng qua một máy chủ proxy.
            Proxy SOCKS5 hỗ trợ cả TCP và UDP, và có thể xử lý nhiều loại lưu lượng mạng.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Định dạng thông tin proxy:</strong> IP:Port (ví dụ: 192.168.1.1:1080)
            </p>
          </div>
        </section>

        {/* Cấu hình Browser */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Cấu hình trong trình duyệt
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Google Chrome / Microsoft Edge</h3>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside ml-4">
                <li>Mở Chrome Settings → Advanced → System</li>
                <li>Click "Open your computer's proxy settings"</li>
                <li>Hoặc sử dụng extension như "Proxy SwitchyOmega"</li>
                <li>Chọn Manual proxy configuration</li>
                <li>Nhập địa chỉ SOCKS5 và port</li>
                <li>Chọn SOCKS5 protocol</li>
                <li>Nhập username và password nếu có</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Mozilla Firefox</h3>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside ml-4">
                <li>Mở Firefox Settings → General → Network Settings</li>
                <li>Click "Settings..."</li>
                <li>Chọn "Manual proxy configuration"</li>
                <li>Trong phần "SOCKS Host", nhập địa chỉ IP và port</li>
                <li>Chọn "SOCKS v5"</li>
                <li>Click "OK" để lưu</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Cấu hình ứng dụng */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. Cấu hình trong ứng dụng
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">cURL</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{`curl --socks5-hostname proxy-ip:port \\
  --proxy-user username:password \\
  https://example.com`}</code>
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Python (requests)</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{`import requests

proxies = {
    'http': 'socks5://username:password@proxy-ip:port',
    'https': 'socks5://username:password@proxy-ip:port'
}

response = requests.get('https://example.com', proxies=proxies)`}</code>
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Node.js (axios)</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-gray-300">
                  <code>{`const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const agent = new SocksProxyAgent(
  'socks5://username:password@proxy-ip:port'
);

axios.get('https://example.com', { httpsAgent: agent });`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Proxy Authentication */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. Xác thực Proxy (Username/Password)
          </h2>
          <p className="text-gray-300 mb-4">
            Nếu proxy yêu cầu xác thực, bạn cần cung cấp username và password:
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <span className="text-gray-400">Format:</span>{' '}
                <code className="bg-gray-800 px-2 py-1 rounded">username:password@host:port</code>
              </div>
              <div>
                <span className="text-gray-400">Ví dụ:</span>{' '}
                <code className="bg-gray-800 px-2 py-1 rounded">user123:pass456@192.168.1.1:1080</code>
              </div>
            </div>
          </div>
        </section>

        {/* Kiểm tra kết nối */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            4. Kiểm tra kết nối
          </h2>
          <p className="text-gray-300 mb-4">
            Để kiểm tra proxy có hoạt động không, bạn có thể:
          </p>
          <ul className="text-gray-300 space-y-2 list-disc list-inside ml-4">
            <li>Truy cập <code className="bg-gray-900 px-2 py-1 rounded">https://whatismyipaddress.com</code> để xem IP hiện tại</li>
            <li>Kiểm tra IP có thay đổi so với IP thực của bạn</li>
            <li>Test tốc độ kết nối</li>
            <li>Kiểm tra độ ổn định</li>
          </ul>
        </section>

        {/* Lưu ý */}
        <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">
            ⚠️ Lưu ý quan trọng
          </h2>
          <ul className="text-yellow-300 space-y-2 list-disc list-inside ml-4">
            <li>Không chia sẻ thông tin proxy với người khác</li>
            <li>Sử dụng proxy một cách hợp pháp và có trách nhiệm</li>
            <li>Một số trang web có thể chặn proxy, hãy kiểm tra trước khi sử dụng</li>
            <li>Proxy có thể ảnh hưởng đến tốc độ kết nối</li>
            <li>Luôn giữ bảo mật thông tin đăng nhập proxy</li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            5. Xử lý sự cố
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-white mb-1">Không kết nối được:</h3>
              <ul className="text-gray-300 space-y-1 list-disc list-inside ml-4 text-sm">
                <li>Kiểm tra địa chỉ IP và port có đúng không</li>
                <li>Kiểm tra username và password</li>
                <li>Kiểm tra firewall/antivirus có chặn không</li>
                <li>Thử proxy khác</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Kết nối chậm:</h3>
              <ul className="text-gray-300 space-y-1 list-disc list-inside ml-4 text-sm">
                <li>Thử proxy ở vị trí địa lý gần hơn</li>
                <li>Kiểm tra tốc độ internet của bạn</li>
                <li>Tránh sử dụng proxy trong giờ cao điểm</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Liên hệ hỗ trợ */}
        <section className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            6. Cần hỗ trợ?
          </h2>
          <p className="text-gray-300">
            Nếu bạn gặp vấn đề hoặc cần hỗ trợ thêm, vui lòng liên hệ với chúng tôi qua email hoặc ticket system.
          </p>
        </section>
      </div>
    </div>
  );
};
