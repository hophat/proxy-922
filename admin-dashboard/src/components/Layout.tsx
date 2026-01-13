import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Network,
  Server,
  ShoppingCart,
  CreditCard,
  Plug,
  Package,
  LogOut,
} from "lucide-react";

const Layout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/users", label: "Users", icon: Users },
    { path: "/proxies", label: "Proxies", icon: Network },
    { path: "/gateways", label: "Gateways", icon: Server },
    { path: "/upstreams", label: "Upstreams", icon: Network },
    { path: "/purchases", label: "Purchases", icon: ShoppingCart },
    { path: "/payments", label: "Payments", icon: CreditCard },
    { path: "/port-mappings", label: "Port Mappings", icon: Plug },
    { path: "/app-versions", label: "App Versions", icon: Package },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white">Proxy US</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
