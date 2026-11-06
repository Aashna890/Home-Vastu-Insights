import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db, provider } from "@/lib/firebase";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ?? "";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);   // Firebase user object
  const [role,          setRole]          = useState(null);   // "admin" | "user" | "blocked"
  const [authChecked,   setAuthChecked]   = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError,     setAuthError]     = useState(null);

  /**
   * Resolve the role of a Firebase user.
   *
   * FIX: Instead of reading the ENTIRE allowed_emails collection (which fails
   * when Firestore rules only permit admin reads), we query only for the
   * document whose `email` field matches the signed-in user's email.
   * Your Firestore rule can then be:
   *
   *   match /allowed_emails/{doc} {
   *     allow read: if request.auth != null
   *                 && resource.data.email == request.auth.token.email;
   *     allow write: if request.auth.token.email == "<ADMIN_EMAIL>";
   *   }
   *
   * This lets every authenticated user check their own record without
   * exposing the full list to non-admins.
   */
  const resolveRole = useCallback(async (firebaseUser) => {
    if (!firebaseUser) return null;
    const email = firebaseUser.email?.trim().toLowerCase() ?? "";

    if (email === ADMIN_EMAIL) return "admin";

    try {
      const q    = query(
        collection(db, "allowed_emails"),
        where("email", "==", email),
      );
      const snap = await getDocs(q);
      return snap.empty ? "blocked" : "user";
    } catch (err) {
      console.error("resolveRole failed:", err.message);
      // Surface the real error so it doesn't silently block valid users.
      // "permission-denied" means the rule above isn't set yet — treat as
      // blocked but log clearly.
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

  // Re-check role after admin changes the allowlist (called from AdminEmailManager)
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