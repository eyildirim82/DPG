import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
    const isAuthenticated = sessionStorage.getItem('dpg_admin_authenticated') === 'true';

    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/admin/login" replace />;
    }

    // Render children (the protected routes)
    return <Outlet />;
}
