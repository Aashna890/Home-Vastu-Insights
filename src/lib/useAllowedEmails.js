import { useState, useEffect, useCallback } from "react";
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
  // Inserts a temporary entry immediately so the UI feels instant.
  // Firestore confirms (or rolls back) in the background.
  const addEmail = useCallback(async (rawEmail) => {
    if (!isAdmin) return;
    const email = rawEmail.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    // Optimistic insert with a temp id
    const tempId = `temp_${Date.now()}`;
    const tempEntry = { id: tempId, email, addedAt: new Date(), addedBy: user?.email ?? "" };
    setEmails(prev => [tempEntry, ...prev]);

    try {
      await addDoc(collection(db, COL), {
        email,
        addedAt: serverTimestamp(),
        addedBy: user?.email ?? "",
      });
      // onSnapshot will fire and replace tempEntry with the real doc
    } catch (err) {
      // Roll back optimistic entry on failure
      setEmails(prev => prev.filter(e => e.id !== tempId));
      throw err;
    }
  }, [isAdmin, user]);

  // ── Optimistic update ──────────────────────────────────────────────────────
  const updateEmail = useCallback(async (id, rawEmail) => {
    if (!isAdmin) return;
    const email = rawEmail.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    // Optimistic update
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

    // Stash for rollback, then remove immediately
    setEmails(prev => {
      const stash = prev.find(e => e.id === id);
      removeEmail._stash = stash;
      return prev.filter(e => e.id !== id);
    });

    try {
      await deleteDoc(doc(db, COL, id));
    } catch (err) {
      // Roll back
      if (removeEmail._stash) {
        setEmails(prev => [removeEmail._stash, ...prev]);
      }
      throw err;
    }
  }, [isAdmin]);

  return { emails, loading, error, addEmail, updateEmail, removeEmail };
}