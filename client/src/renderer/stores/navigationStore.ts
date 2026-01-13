import { create } from 'zustand';

export type Route = 'dashboard' | 'proxies' | 'port-forwards' | 'rotating-proxies' | 'payment-history' | 'settings';

interface NavigationState {
  currentRoute: Route;
  navigateTo: (route: Route) => void;
  setRoute: (route: Route) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: 'dashboard',

  navigateTo: (route: Route) => set({ currentRoute: route }),
  setRoute: (route: Route) => set({ currentRoute: route }),
}));
