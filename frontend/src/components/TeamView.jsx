import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  UserCheck, 
  CheckCircle2, 
  X, 
  ShieldAlert,
  Building2,
  Lock
} from 'lucide-react';
import { api } from '../services/api';

export default function TeamView({ user }) {
  const [users, setUsers] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchUsers = async () => {
    try {
      const userList = await api.listUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      setSuccessMsg(`User role changed to ${newRole.toUpperCase()}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user role');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setErrorMsg(null);
    try {
      await api.inviteUser(inviteEmail.trim(), inviteRole, inviteName.trim() || null);
      setSuccessMsg(`Invitation dispatched to ${inviteEmail} via Resend (${inviteRole.toUpperCase()})`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('analyst');
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch teammate invitation email');
    } finally {
      setIsInviting(false);
    }
  };

  // RBAC Server-side Enforcement Guard
  if (user?.role !== 'admin') {
    return (
      <div className="neo-card bg-[#FFF1F2] border-3 border-black shadow-[6px_6px_0px_0px_#000] p-8 text-center space-y-4 font-mono">
        <div className="w-14 h-14 bg-[#FF6B6B] text-black border-2 border-black font-extrabold mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 stroke-[3]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-black">403 ACCESS DENIED &mdash; ADMIN ROLE REQUIRED</h2>
          <p className="text-sm text-zinc-800 font-bold mt-2 max-w-md mx-auto">
            Team provisioning and organization role management are restricted to Administrators (`ADMIN`). Your current role is `{user?.role?.toUpperCase()}`.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-zinc-950">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-black pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2">
            <Users className="w-7 h-7 stroke-[2.5]" />
            <span>ORGANIZATION TEAM ROSTER &amp; PROVISIONING</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-800 font-bold mt-1">
            MANAGE MEMBERS &amp; ROLE ASSIGNMENTS FOR {users[0]?.organization_name?.toUpperCase() || user?.organization_name?.toUpperCase() || 'FINANCECORP'}
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="neo-button-primary text-xs sm:text-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ INVITE TEAMMATE</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-[#BBF7D0] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] text-xs sm:text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 stroke-[3] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#FF6B6B] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] text-xs sm:text-sm font-bold flex items-center gap-2">
          <X className="w-5 h-5 stroke-[3] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="neo-table-header">Member Name</th>
              <th className="neo-table-header">Corporate Email</th>
              <th className="neo-table-header">Role Assignment</th>
              <th className="neo-table-header">Auth Provider</th>
              <th className="neo-table-header">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-yellow-50/50 transition">
                <td className="neo-table-cell font-bold text-black">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 bg-[#FFE600] text-black font-black text-xs flex items-center justify-center border-2 border-black">
                      {u.full_name?.slice(0, 2).toUpperCase() || 'FA'}
                    </div>
                    <span className="font-black text-sm">{u.full_name}</span>
                  </div>
                </td>
                <td className="neo-table-cell font-sans font-semibold text-zinc-900">{u.email}</td>
                <td className="neo-table-cell">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="neo-input py-1 px-2 text-xs sm:text-sm w-auto cursor-pointer border-2 border-black"
                  >
                    <option value="admin">ADMIN</option>
                    <option value="analyst">ANALYST</option>
                    <option value="viewer">VIEWER</option>
                  </select>
                </td>
                <td className="neo-table-cell">
                  <span className={`neo-badge ${
                    u.provider === 'google' 
                      ? 'bg-[#BAE6FD] text-black' 
                      : 'bg-zinc-100 text-zinc-900'
                  }`}>
                    {u.provider === 'google' ? 'GOOGLE WORKSPACE' : 'LOCAL'}
                  </span>
                </td>
                <td className="neo-table-cell text-zinc-700 font-sans text-xs">
                  {u.last_active ? new Date(u.last_active).toLocaleString() : 'Active now'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Teammate Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neo-card bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 space-y-4 text-black relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            <div className="space-y-1">
              <span className="neo-badge bg-[#FFE600] text-black">EMAIL DISPATCH</span>
              <h3 className="text-lg font-black text-black flex items-center gap-2 mt-1 uppercase">
                <UserPlus className="w-5 h-5 text-black stroke-[2.5]" />
                <span>INVITE CORPORATE TEAMMATE</span>
              </h3>
              <p className="text-xs text-zinc-700 font-bold">
                Send an invitation under {user?.organization_name || 'FinanceCorp'}.
              </p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-black block mb-1 uppercase">CORPORATE EMAIL</label>
                <input
                  type="email"
                  required
                  placeholder="teammate@finance.corp"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div>
                <label className="text-xs font-black text-black block mb-1 uppercase">FULL NAME (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="neo-input"
                />
              </div>

              <div>
                <label className="text-xs font-black text-black block mb-1 uppercase">ASSIGNED RBAC ROLE</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="neo-input"
                >
                  <option value="analyst">ANALYST (Upload + Extract + AI Q&A)</option>
                  <option value="admin">ADMIN (Manage Teammates + Audit Logs)</option>
                  <option value="viewer">VIEWER (Read-Only Authorized Reports)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="neo-button-secondary text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="neo-button-primary text-xs"
                >
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>{isInviting ? 'DISPATCHING EMAIL...' : 'DISPATCH INVITE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
