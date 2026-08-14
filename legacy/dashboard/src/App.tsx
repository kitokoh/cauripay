import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getToken, request, type Merchant } from './api';
import { loadRegistries } from './registries';
import { Layout } from './components/Layout';
import { Toasts } from './components/Toast';
import { Spinner } from './components/StatCard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewPage } from './pages/OverviewPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { KeysPage } from './pages/KeysPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App(): JSX.Element {
  // Registres devises/méthodes : source de vérité = API (issue #46).
  void loadRegistries();
  return (
    <BrowserRouter>
      <Toasts />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app/*" element={<ProtectedApp />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedApp(): JSX.Element {
  const [merchant, setMerchant] = useState<Merchant | null | 'loading'>('loading');

  useEffect(() => {
    if (!getToken()) {
      setMerchant(null);
      return;
    }
    request<{ merchant: Merchant }>('/auth/me')
      .then((r) => setMerchant(r.merchant))
      .catch(() => setMerchant(null));
  }, []);

  if (merchant === 'loading') {
    return (
      <div className="center-page">
        <Spinner />
      </div>
    );
  }
  if (!merchant) return <Navigate to="/login" replace />;

  return (
    <Layout merchant={merchant}>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="payments/:id" element={<PaymentDetailPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="keys" element={<KeysPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Layout>
  );
}
