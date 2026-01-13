import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyPurchasesPage } from './pages/MyPurchasesPage';
import { ProxyGuidePage } from './pages/ProxyGuidePage';
import { UpstreamsPage } from './pages/UpstreamsPage';
import { RotatingProxiesPage } from './pages/RotatingProxiesPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Layout>
                <HomePage />
              </Layout>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyPurchasesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/proxy-guide"
            element={
              <Layout>
                <ProxyGuidePage />
              </Layout>
            }
          />
          <Route
            path="/upstreams"
            element={
              <ProtectedRoute>
                <Layout>
                  <UpstreamsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/rotating-proxies"
            element={
              <ProtectedRoute>
                <Layout>
                  <RotatingProxiesPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
