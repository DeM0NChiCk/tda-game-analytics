import React from 'react';
import './App.css';

import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import LoginPage from "./page/LoginPage";
import RegisterPage from "./page/RegisterPage";
import Dashboard from "./page/Dashboard";
import Profile from "./page/ProfilePage";
import AnalyticsPage from "./page/AnalyticsPage";
import ProtectedRoute from "./auth/ProtectedRoute";


function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
            <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
            <Route path="/analytics" element={<ProtectedRoute element={<AnalyticsPage />} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
}

export default App;
