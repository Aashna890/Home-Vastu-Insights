import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const COL = "allowed_emails";

export function useAllowedEmails() {
  const { user, isAdmin } = useAuth();
  const [emails,  setEmails]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /**
   * FIX: Use a ref to stash the entry being removed so it survives
   * re-renders and useCallback recreation.  The old pattern stored the
   * stash as `removeEmail._stash` — a property on the function object
   * itself — which is lost whenever useCallback recreates the function.
   */
  const removeStashRef = useRef(null);

  // Real-time Firestore listener
  useEffect(() => {
    if (!isAdmin) { setEmails([]); setLoading(false); return; }

    const q = query(collection(db, COL), orderBy("addedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEmails(
          snap.docs.map(d => ({
            id:      d.id,
            email:   d.data().email ?? "",
            addedAt: d.data().addedAt?.toDate?.() ?? null,
            addedBy: d.data().addedBy ?? "",
          }))
        );
        setLoading(false);
      },
      (err) => { setError(err.message); setLoading(false); }
    );
    return unsub;
  }, [isAdmin]);

  // ── Optimistic add ─────────────────────────────────────────────────────────
  const addEmail = useCallback(async (rawEmail) => {
    if (!isAdmin) return;
    const email = rawEmail.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    const tempId    = `temp_${Date.now()}`;
    const tempEntry = { id: tempId, email, addedAt: new Date(), addedBy: user?.email ?? "" };
    setEmails(prev => [tempEntry, ...prev]);

    try {
      await addDoc(collection(db, COL), {
        email,
        addedAt: serverTimestamp(),
        addedBy: user?.email ?? "",
      });
      // onSnapshot fires and swaps tempEntry for the real doc
    } catch (err) {
      setEmails(prev => prev.filter(e => e.id !== tempId));
      throw err;
    }
  }, [isAdmin, user]);

  // ── Optimistic update ──────────────────────────────────────────────────────
  const updateEmail = useCallback(async (id, rawEmail) => {
    if (!isAdmin) return;
    const email = rawEmail.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    setEmails(prev => prev.map(e => e.id === id ? { ...e, email } : e));

    try {
      await updateDoc(doc(db, COL, id), { email });
    } catch (err) {
      // onSnapshot will restore the real value automatically
      throw err;
    }
  }, [isAdmin]);

  // ── Optimistic remove ──────────────────────────────────────────────────────
  const removeEmail = useCallback(async (id) => {
    if (!isAdmin) return;

    // FIX: stash via ref before the state update so it's always reachable
    setEmails(prev => {
      removeStashRef.current = prev.find(e => e.id === id) ?? null;
      return prev.filter(e => e.id !== id);
    });

    try {
      await deleteDoc(doc(db, COL, id));
      removeStashRef.current = null;
    } catch (err) {
      // Roll back using the ref — always valid regardless of re-renders
      if (removeStashRef.current) {
        setEmails(prev => {
          // Avoid duplicate if onSnapshot already re-added it
          if (prev.some(e => e.id === removeStashRef.current.id)) return prev;
          return [removeStashRef.current, ...prev];
        });
        removeStashRef.current = null;
      }
      throw err;
    }
  }, [isAdmin]);

  return { emails, loading, error, addEmail, updateEmail, removeEmail };
}