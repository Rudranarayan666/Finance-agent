import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Clock, 
  CheckCircle2, 
  UserPlus, 
  Search, 
  Filter, 
  RotateCcw, 
  Building2,
  X,
  Mail,
  UserCheck,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeAdminTab, setActiveAdminTab] = useState('users');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Invite Teammate Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Audit Logs Filter State
  const [filterAction, setFilterAction] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDocId, setFilterDocId] = useState('');

  const fetchUsers = async () => {
    try {
      const userList = await api.listUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await api.getAuditLogs({
        limit: 100,
        action: filterAction,
        userEmail: filterEmail,
        documentId: filterDocId
      });
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      setSuccessMsg(`User role successfully changed to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchUsers();
      fetchLogs();
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
      setSuccessMsg(`Invitation sent to ${inviteEmail} (${inviteRole})`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('analyst');
      fetchUsers();
      fetchLogs();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send teammate invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleApplyLogFilters = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetLogFilters = () => {
    setFilterAction('');
    setFilterEmail('');
    setFilterDocId('');
    api.getAuditLogs({ limit: 100 }).then(setAuditLogs);
  };

  const formatLastActive = (dateStr) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - d) / (1000 * 60));
    if (diffMins < 2) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>Enterprise Admin & Security Control</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Org Scope: {users[0]?.organization_name || 'FinanceCorp Global'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Organization member provisioning, inline role assignments, and immutable audit logs
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeAdminTab === 'users'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Org Members ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('logs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeAdminTab === 'logs'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Log ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
          <X className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: USERS MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Organization Membership Roster
            </span>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-purple-950 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Teammate</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Corporate Email</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-purple-400 font-bold border border-slate-700">
                          {u.full_name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <span>{u.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:border-purple-500 focus:outline-none cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="analyst">Analyst</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        u.provider === 'google' 
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {u.provider || 'local'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {formatLastActive(u.last_active)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED AUDIT LOG TAB WITH FILTERABLE CONTROLS */}
      {activeAdminTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <form onSubmit={handleApplyLogFilters} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                <span>Filter Compliance Events</span>
              </span>
              <button
                type="button"
                onClick={handleResetLogFilters}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition font-mono"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Action (e.g. upload, share, login)..."
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="User email..."
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Document ID..."
                  value={filterDocId}
                  onChange={(e) => setFilterDocId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 flex-shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          </form>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Document / Target</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-200 font-sans font-medium">{log.user_email || 'System'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                          log.action.includes('admin')
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : log.action.includes('share')
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : log.action === 'upload'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                        {log.document_id ? log.document_id.slice(0, 16) + '…' : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">
                      No audit log records match the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Teammate Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e1424] border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span>Invite Teammate</span>
              </h3>
              <p className="text-xs text-slate-400">
                Grant access to this corporate workspace under {users[0]?.organization_name || 'FinanceCorp Global'}.
              </p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Corporate Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="teammate@finance.corp"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Assign Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="analyst">Analyst (Upload + Extraction + AI Q&A)</option>
                  <option value="admin">Admin (Member Management + Audit Logs)</option>
                  <option value="viewer">Viewer (Read-Only Shared Filings)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-950 flex items-center space-x-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isInviting ? 'Inviting...' : 'Send Invite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
