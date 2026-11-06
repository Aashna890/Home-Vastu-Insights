import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Loader2 } from "lucide-react";
import { Button }     from "@/components/ui/button";
import AuthLayout     from "@/components/AuthLayout";
import GoogleIcon     from "@/components/GoogleIcon";
import { useAuth }    from "@/lib/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle, isAuthenticated, isAdmin, isLoadingAuth, authError } = useAuth();
  const navigate = useNavigate();

  // Redirect away if already authenticated
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    }
  }, [isAuthenticated, isAdmin, isLoadingAuth, navigate]);

  const handleSignIn = async () => {
    await signInWithGoogle();
    // Navigation happens via the useEffect above once auth state settles
  };

  return (
    <AuthLayout
      icon={Compass}
      title="Vastu Analyzer"
      subtitle="Sign in with your Google account to continue"
      footer="Access is restricted to registered users only."
    >
      <div className="space-y-4">
        <Button
          onClick={handleSignIn}
          disabled={isLoadingAuth}
          className="w-full flex items-center justify-center gap-3 h-11"
          variant="outline"
        >
          {isLoadingAuth ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          {isLoadingAuth ? "Signing in…" : "Continue with Google"}
        </Button>

        {authError?.type === "sign_in_failed" && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-md px-3 py-2 text-center">
            {authError.message ?? "Sign-in failed. Please try again."}
          </p>
        )}

        {authError?.type === "user_not_registered" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2 text-center">
            Your account is not registered. Contact the administrator for access.
          </p>
        )}
      </div>
    </AuthLayout>
  );
}