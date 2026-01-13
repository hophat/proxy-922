import React from 'react';
import { useAuthStore, useNavigationStore, type Route } from './stores';

export interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
}) => {
  // Get state from stores
  const currentRoute = useNavigationStore((state) => state.currentRoute);
  const userEmail = useAuthStore((state) => state.userEmail);

  const menuItems: Array<{ id: Route; icon: string; label: string }> = [
    {
      id: 'dashboard',
      icon: 'dashboard',
      label: 'Dashboard',
    },
    {
      id: 'proxies',
      icon: 'router',
      label: 'Proxies',
    },
    {
      id: 'port-forwards',
      icon: 'shopping_bag',
      label: 'Đã Mua',
    },
    {
      id: 'rotating-proxies',
      icon: 'autorenew',
      label: 'Proxy Xoay',
    },
    {
      id: 'payment-history',
      icon: 'receipt_long',
      label: 'Lịch sử thanh toán',
    },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Settings',
    },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-[#243647] bg-[#111a22] shrink-0 h-screen">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          {/* Brand / Profile Snippet */}
          <div className="flex gap-3 items-center px-2 py-2">
            <div className="flex items-center justify-center rounded-lg size-10 overflow-hidden bg-white/10">
              <img 
                src="/logo.png" 
                alt="Proxy96 Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to gradient if logo not found
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.className = 'bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-gradient-to-br from-primary to-purple-600';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-base font-bold leading-normal">Proxy96</h1>
              <p className="text-[#93adc8] text-xs font-normal leading-normal">v2.4.0</p>
            </div>
          </div>

          {/* Nav Items */}
          <div className="flex flex-col gap-2 mt-4">
            {menuItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                    isActive
                      ? 'bg-[#243647] hover:bg-[#2f455a]'
                      : 'hover:bg-[#1a2632]'
                  }`}
                  onClick={() => {
                    const store = useNavigationStore.getState();
                    store.navigateTo(item.id);
                  }}
                >
                  <span
                    className={`material-symbols-outlined transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-[#93adc8] group-hover:text-white'
                    }`}
                    style={{ fontSize: '24px' }}
                  >
                    {item.icon}
                  </span>
                  <p
                    className={`text-sm font-medium leading-normal transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-[#93adc8] group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a2632] transition-colors text-[#93adc8] hover:text-red-400"
          onClick={onLogout}
        >
          <span className="material-symbols-outlined">logout</span>
          <p className="text-sm font-medium leading-normal">Log Out</p>
        </div>
      </div>
    </aside>
  );
};
