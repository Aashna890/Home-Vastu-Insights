import { Toaster }             from "@/components/ui/toaster";
import { QueryClientProvider }  from "@tanstack/react-query";
import { queryClientInstance }  from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound             from "@/lib/PageNotFound";
import ScrollToTop              from "@/components/ScrollToTop";
import { AuthProvider }         from "@/lib/AuthContext";
import ProtectedRoute           from "@/components/ProtectedRoute";
import LoginPage                from "@/pages/LoginPage";
import VastuAnalyzer            from "@/pages/VastuAnalyzer";
import AdminEmailManager        from "@/pages/AdminEmailManager";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — any authenticated + allowed user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<VastuAnalyzer />} />
            </Route>

            {/* Protected — admin only */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route path="/admin" element={<AdminEmailManager />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;