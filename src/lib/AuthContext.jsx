import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, provider } from "@/lib/firebase";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);   // Firebase user object
  const [role,          setRole]          = useState(null);   // "admin" | "user" | "blocked"
  const [authChecked,   setAuthChecked]   = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError,     setAuthError]     = useState(null);

  // Resolve the role of a Firebase user against the allowed-emails collection.
  const resolveRole = useCallback(async (firebaseUser) => {
    if (!firebaseUser) return null;
    const email = firebaseUser.email?.trim().toLowerCase() ?? "";

    if (email === ADMIN_EMAIL) return "admin";

    // Check Firestore allowed_emails collection
    try {
      const snap = await getDocs(collection(db, "allowed_emails"));
      const allowed = snap.docs.map(d => (d.data().email ?? "").trim().toLowerCase());
      return allowed.includes(email) ? "user" : "blocked";
    } catch {
      // If Firestore read fails, treat as blocked to be safe
      return "blocked";
    }
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoadingAuth(true);
      setAuthError(null);

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      const resolved = await resolveRole(firebaseUser);
      setUser(firebaseUser);
      setRole(resolved);

      if (resolved === "blocked") {
        setAuthError({ type: "user_not_registered" });
      }

      setAuthChecked(true);
      setIsLoadingAuth(false);
    });

    return unsub;
  }, [resolveRole]);

  const signInWithGoogle = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged fires after this — no need to setUser here
    } catch (err) {
      setAuthError({ type: "sign_in_failed", message: err.message });
      setIsLoadingAuth(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
    setAuthChecked(false);
    setAuthError(null);
  }, []);

  // Re-check role after admin changes the allowlist (call this from AdminEmailManager)
  const recheckRole = useCallback(async () => {
    if (!user) return;
    const resolved = await resolveRole(user);
    setRole(resolved);
    setAuthError(resolved === "blocked" ? { type: "user_not_registered" } : null);
  }, [user, resolveRole]);

  const value = {
    user,
    role,
    isAdmin:         role === "admin",
    isAuthenticated: role === "admin" || role === "user",
    isLoadingAuth,
    authChecked,
    authError,
    signInWithGoogle,
    logout,
    recheckRole,
    // kept for compatibility with existing ProtectedRoute.jsx
    checkUserAuth: () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}