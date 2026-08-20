"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Users, Mail, Shield, UserCog } from "lucide-react";

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  phone: string | null;
  created_at: string;
}

export default function AdminAccountsPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setCurrentUser(myProfile as Profile);
      setNewEmail(myProfile?.email ?? user.email ?? "");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(() => { void fetchProfiles(); }, 0);
    return () => clearTimeout(id);
  }, [fetchProfiles]);

  const handleRoleChange = async () => {
    if (!editing) return;
    await supabase.from("profiles").update({ role: editRole }).eq("id", editing.id);
    setEditing(null);
    fetchProfiles();
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Password updated successfully!");
      setShowPasswordForm(false);
      setNewPassword("");
    }
  };

  const handleChangeEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Email update initiated. Check your inbox to confirm.");
      setShowEmailForm(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-ink-soft">Loading...</div>;

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-ink mb-6">Accounts</h1>

      {message && (
        <div className="mb-4 rounded-xl bg-mint-soft border border-mint/20 p-3">
          <p className="text-sm text-ink">{message}</p>
        </div>
      )}

      {/* My account */}
      <Card className="mb-6">
        <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
          <UserCog size={20} className="text-pink" /> My Account
        </h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-ink-faint" />
            <span className="text-ink">{currentUser?.email}</span>
            <Badge color="pink">{currentUser?.role}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPasswordForm(!showPasswordForm)}>
              Change Password
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowEmailForm(!showEmailForm)}>
              Change Email
            </Button>
          </div>

          {showPasswordForm && (
            <div className="flex gap-2 mt-2">
              <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Button size="sm" variant="primary" onClick={handleChangePassword}>Update</Button>
            </div>
          )}

          {showEmailForm && (
            <div className="flex gap-2 mt-2">
              <Input type="email" placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Button size="sm" variant="primary" onClick={handleChangeEmail}>Update</Button>
            </div>
          )}
        </div>
      </Card>

      {/* All accounts (admin only) */}
      {isAdmin && (
        <Card>
          <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Users size={20} className="text-pink" /> All Accounts
          </h2>
          <div className="flex flex-col gap-2">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between rounded-xl border border-ink/8 p-3">
                <div className="flex items-center gap-3">
                  <Shield className="text-ink-faint" size={16} />
                  <div>
                    <p className="text-sm font-medium text-ink">{profile.full_name || profile.email}</p>
                    <p className="text-xs text-ink-faint">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={profile.role === "admin" ? "pink" : profile.role === "staff" ? "mint" : "neutral"}>
                    {profile.role}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(profile); setEditRole(profile.role); }}>
                    Edit Role
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Edit Role" size="sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">Change role for <strong>{editing.email}</strong></p>
            <Select label="Role" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleRoleChange}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
