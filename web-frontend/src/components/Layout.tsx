import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-white">
              Proxy992
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Trang chủ
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/purchases"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Mua hàng của tôi
                  </Link>

                  <div className="flex items-center gap-4">
                    <span className="text-gray-300">{user?.email}</span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Đăng nhập
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
