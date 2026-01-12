import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/users/UsersPage";
import ProxiesPage from "./pages/proxies/ProxiesPage";
import GatewaysPage from "./pages/gateways/GatewaysPage";
import UpstreamsPage from "./pages/upstreams/UpstreamsPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import PaymentsPage from "./pages/payments/PaymentsPage";
import PortMappingsPage from "./pages/port-mappings/PortMappingsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { ADMIN_BASE_PATH } from "./constants/routes";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter basename={ADMIN_BASE_PATH}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="proxies" element={<ProxiesPage />} />
            <Route path="gateways" element={<GatewaysPage />} />
            <Route path="upstreams" element={<UpstreamsPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="port-mappings" element={<PortMappingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
