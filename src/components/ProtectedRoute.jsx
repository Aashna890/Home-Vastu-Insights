import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <Loader2 className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

/**
 * Props:
 *   requireAdmin  — if true, only "admin" role passes; others get a 404-style redirect.
 *   fallback      — shown while auth is loading (default: spinner).
 */
export default function ProtectedRoute({ requireAdmin = false, fallback = <DefaultFallback /> }) {
  const { isAuthenticated, isAdmin, isLoadingAuth, authChecked, role } = useAuth();

  if (isLoadingAuth || !authChecked) return fallback;

  // Not signed in → go to login
  if (!isAuthenticated && role !== "blocked") {
    return <Navigate to="/login" replace />;
  }

  // Signed in but blocked (not in allowlist)
  if (role === "blocked") {
    return <UserNotRegisteredError />;
  }

  // Admin-only route accessed by a regular user
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}