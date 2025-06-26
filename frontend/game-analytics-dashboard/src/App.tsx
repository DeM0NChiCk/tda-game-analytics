import React from 'react';
// import logo from './logo.svg';
import './App.css';

import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import LoginPage from "./page/LoginPage";
import RegisterPage from "./page/RegisterPage";
import Dashboard from "./page/Dashboard";
import Profile from "./page/ProfilePage";
import AnalyticsPage from "./page/AnalyticsPage";

function App() {
  return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
}

export default App;
