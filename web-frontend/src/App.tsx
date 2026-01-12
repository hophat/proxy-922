import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MyPurchasesPage } from './pages/MyPurchasesPage';
import { ProxyGuidePage } from './pages/ProxyGuidePage';

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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
