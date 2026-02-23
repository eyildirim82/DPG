import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicPage from './pages/PublicPage';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import SubmissionsList from './components/admin/SubmissionsList';
import WhitelistManager from './components/admin/WhitelistManager';
import CommunicationManager from './components/admin/CommunicationManager';
import AdminLogin from './components/admin/AdminLogin';
import ProtectedRoute from './components/admin/ProtectedRoute';
import DynamicFormPage from './pages/DynamicFormPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/apply" element={<DynamicFormPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="whitelist" element={<WhitelistManager />} />
            <Route path="submissions" element={<SubmissionsList />} />
            <Route path="communication" element={<CommunicationManager />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
