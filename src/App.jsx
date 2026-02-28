import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/admin/ProtectedRoute';

// Lazy-loaded route components (code-splitting)
const PublicPage = lazy(() => import('./pages/PublicPage'));
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Dashboard = lazy(() => import('./components/admin/Dashboard'));
const SubmissionsList = lazy(() => import('./components/admin/SubmissionsList'));
const WhitelistManager = lazy(() => import('./components/admin/WhitelistManager'));
const CommunicationManager = lazy(() => import('./components/admin/CommunicationManager'));
const EmailTemplateManager = lazy(() => import('./components/admin/EmailTemplateManager'));
const QuotaSettings = lazy(() => import('./components/admin/QuotaSettings'));
const SmtpSettings = lazy(() => import('./components/admin/SmtpSettings'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<PublicPage />} />
          {/* /apply route disabled — bypasses quota/lock RPC flow (see audit report #7) */}
          <Route path="/apply" element={<Navigate to="/" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="whitelist" element={<WhitelistManager />} />
              <Route path="submissions" element={<SubmissionsList />} />
              <Route path="communication" element={<CommunicationManager />} />
              <Route path="email-templates" element={<EmailTemplateManager />} />
              <Route path="quota" element={<QuotaSettings />} />
              <Route path="smtp" element={<SmtpSettings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
