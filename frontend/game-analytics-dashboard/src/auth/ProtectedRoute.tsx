import React, { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  element: ReactElement;
}

export default function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { token } = useAuth();

  const isAuthenticated = !!token;

  return isAuthenticated ? element : <Navigate to="/login" replace />;
}