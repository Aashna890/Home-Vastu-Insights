import React, { useState } from "react";
import { Navigate }         from "react-router-dom";
import { Loader2, Plus, Pencil, Trash2, Check, X, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input  } from "@/components/ui/input";
import { useAuth }          from "@/lib/AuthContext";
import { useAllowedEmails } from "@/lib/useAllowedEmails";

function formatDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function AdminEmailManager() {
  const { isAdmin, isLoadingAuth, authChecked, user, logout } = useAuth();
  const { emails, loading, error, addEmail, updateEmail, removeEmail } = useAllowedEmails();

  const [newEmail,  setNewEmail]  = useState("");
  const [addError,  setAddError]  = useState("");

  // Inline edit state: { id, value }
  const [editing,   setEditing]   = useState(null);
  const [editError, setEditError] = useState("");

  // FIX: Track which row is mid-save so the input can be disabled during the
  // async write.  Previously this was `savingId` which was never declared,
  // causing a ReferenceError crash the moment the edit row rendered.
  const [savingId,  setSavingId]  = useState(null);

  // Guard — only admin can access
  if (!isLoadingAuth && authChecked && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    setAddError("");
    if (!validateEmail(newEmail)) { setAddError("Enter a valid email address."); return; }
    const dup = emails.some(e => e.email === newEmail.trim().toLowerCase());
    if (dup) { setAddError("This email is already in the list."); return; }

    const submitted = newEmail;
    setNewEmail("");
    try {
      await addEmail(submitted);
    } catch (err) {
      setNewEmail(submitted);
      setAddError(err.message);
    }
  };

  const startEdit = (entry) => {
    setEditing({ id: entry.id, value: entry.email });
    setEditError("");
  };

  const cancelEdit = () => { setEditing(null); setEditError(""); };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setEditError("");
    if (!validateEmail(editing.value)) { setEditError("Enter a valid email address."); return; }
    const dup = emails.some(
      e => e.email === editing.value.trim().toLowerCase() && e.id !== editing.id
    );
    if (dup) { setEditError("This email already exists."); return; }

    const { id, value } = editing;
    setEditing(null);
    setSavingId(id);
    try {
      await updateEmail(id, value);
    } catch (err) {
      setEditing({ id, value });
      setEditError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleRemove = async (id) => {
    if (editing?.id === id) setEditing(null);
    try {
      await removeEmail(id);
    } catch {
      // onSnapshot will restore the entry if the delete fails
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ── */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg tracking-tight">Admin — Access Management</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/">← Vastu Analyzer</a>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-1 text-muted-foreground">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* ── Add new email ── */}
        <section className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" /> Add allowed email
          </h2>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newEmail.trim()} className="shrink-0">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
          {addError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded px-3 py-1">{addError}</p>
          )}
        </section>

        {/* ── Allowed emails list ── */}
        <section className="bg-card border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Allowed users
            </h2>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {emails.length} {emails.length === 1 ? "user" : "users"}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-rose-600 px-6 py-4">{error}</p>
          )}

          {!loading && !error && emails.length === 0 && (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">
              No users added yet. Add an email above to grant access.
            </p>
          )}

          {!loading && !error && emails.length > 0 && (
            <ul className="divide-y divide-border">
              {emails.map((entry) => (
                <li key={entry.id} className="px-6 py-3">
                  {editing?.id === entry.id ? (
                    /* ── Inline edit row ── */
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={editing.value}
                          autoFocus
                          onChange={e => {
                            setEditing(prev => ({ ...prev, value: e.target.value }));
                            setEditError("");
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter")  handleSaveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 h-8 text-sm"
                          // FIX: savingId is now a proper state variable
                          disabled={savingId === entry.id}
                        />
                        <Button
                          size="sm" variant="default"
                          onClick={handleSaveEdit}
                          disabled={savingId === entry.id}
                          className="h-8 px-3"
                        >
                          {savingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={cancelEdit}
                          disabled={savingId === entry.id}
                          className="h-8 px-3 text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {editError && (
                        <p className="text-xs text-rose-600">{editError}</p>
                      )}
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{entry.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(entry.addedAt)}
                          {entry.addedBy ? ` · by ${entry.addedBy}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => startEdit(entry)}
                          disabled={!!editing}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit email"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleRemove(entry.id)}
                          disabled={!!editing}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          title="Remove access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Info box ── */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 space-y-1">
          <p>• Only emails in this list (plus the admin email) can access the Vastu Analyzer.</p>
          <p>• Changes take effect the next time a user signs in or refreshes the page.</p>
          <p>• The admin email is set via the <code className="bg-muted px-1 rounded">VITE_ADMIN_EMAIL</code> environment variable and cannot be managed here.</p>
        </div>

      </main>
    </div>
  );
}