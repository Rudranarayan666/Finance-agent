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
  FileText,
  Lock,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityFeed, setSecurityFeed] = useState([]);
  const [activeAdminTab, setActiveAdminTab] = useState('users'); // 'users', 'security', 'logs'
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');
  const [inviteName, setInviteName] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterEmail, setFilterEmail] = useState('');

  const fetchUsers = async () => {
    try {
      const userList = await api.listUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchSecurityFeed = async () => {
    try {
      const feed = await api.getSecurityChatFeed();
      setSecurityFeed(feed);
    } catch (err) {
      console.error('Failed to fetch security feed:', err);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await api.getAuditLogs({
        limit: 100,
        action: filterAction,
        userEmail: filterEmail
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
    fetchSecurityFeed();
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
      setSuccessMsg(`Invitation dispatched to ${inviteEmail} (${inviteRole})`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('analyst');
      fetchUsers();
      fetchLogs();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="neo-card bg-white border-3 shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-6 space-y-5 font-mono text-zinc-900">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm sm:text-base font-black text-black uppercase flex items-center space-x-2">
              <Shield className="w-4 h-4 stroke-[3]" />
              <span>ADMINISTRATIVE GOVERNANCE &amp; SECURITY CONTROLS</span>
            </h2>
            <span className="neo-badge-yellow text-xs">ROOT ACCESS</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-800 font-sans font-medium mt-0.5">
            Role-Based Access Management, Google Workspace Identity Tracking &amp; Chatbot Security Feed
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center space-x-1 bg-[#F4F4F5] p-1 border-2 border-black">
            <button
              onClick={() => setActiveAdminTab('users')}
              className={`px-3 py-1 text-xs font-black uppercase transition cursor-pointer ${
                activeAdminTab === 'users'
                  ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-800 hover:text-black hover:bg-white'
              }`}
            >
              USERS ({users.length})
            </button>
            <button
              onClick={() => { setActiveAdminTab('security'); fetchSecurityFeed(); }}
              className={`px-3 py-1 text-xs font-black uppercase transition cursor-pointer ${
                activeAdminTab === 'security'
                  ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-800 hover:text-black hover:bg-white'
              }`}
            >
              CHATBOT AUDIT ({securityFeed.length})
            </button>
            <button
              onClick={() => setActiveAdminTab('logs')}
              className={`px-3 py-1 text-xs font-black uppercase transition cursor-pointer ${
                activeAdminTab === 'logs'
                  ? 'bg-[#FFE600] text-black border border-black shadow-[1px_1px_0px_0px_#000]'
                  : 'text-zinc-800 hover:text-black hover:bg-white'
              }`}
            >
              SYSTEM LOGS
            </button>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="neo-button-primary text-xs sm:text-sm py-1 px-3"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>INVITE</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-2.5 bg-[#DCFCE7] border-2 border-black text-green-950 text-xs sm:text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 stroke-[3]" />
          <span className="font-sans font-bold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-2.5 bg-[#FEE2E2] border-2 border-black text-rose-950 text-xs sm:text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 stroke-[3]" />
          <span className="font-sans font-bold">{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: USERS DIRECTORY */}
      {activeAdminTab === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-black uppercase">
            <span>Corporate User Directory</span>
            <span className="neo-badge text-xs bg-zinc-100 text-black">3 ACCESS TIERS ENFORCED</span>
          </div>

          <div className="overflow-x-auto border-2 border-black bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="neo-table-header">USER / CORPORATE EMAIL</th>
                  <th className="neo-table-header">AUTH PROVIDER</th>
                  <th className="neo-table-header">CURRENT ROLE</th>
                  <th className="neo-table-header">ORGANIZATION</th>
                  <th className="neo-table-header text-right">MODIFY CLEARANCE</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isAdminUser = u.role === 'admin';
                  const isAnalystUser = u.role === 'analyst';
                  return (
                    <tr key={u.id} className="hover:bg-yellow-50/50">
                      <td className="neo-table-cell">
                        <div className="font-black text-black text-sm">{u.full_name || 'Corporate User'}</div>
                        <div className="text-xs text-zinc-800 font-sans font-medium">{u.email}</div>
                      </td>
                      <td className="neo-table-cell">
                        <span className={`neo-badge text-xs py-0 ${
                          u.provider === 'google' ? 'bg-[#BAE6FD] text-black' : 'bg-[#F4F4F5] text-zinc-900'
                        }`}>
                          {u.provider === 'google' ? 'GOOGLE WORKSPACE' : 'LOCAL CREDENTIALS'}
                        </span>
                      </td>
                      <td className="neo-table-cell">
                        <span className={`neo-badge text-xs py-0.5 ${
                          isAdminUser ? 'bg-[#FFE600] text-black font-black' : isAnalystUser ? 'bg-[#BAE6FD] text-black font-bold' : 'bg-zinc-200 text-zinc-900'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="neo-table-cell text-xs sm:text-sm font-sans font-semibold text-black">
                        {u.organization_name || 'FinanceCorp Global'}
                      </td>
                      <td className="neo-table-cell text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="neo-input text-xs sm:text-sm py-1 px-2 w-auto cursor-pointer border-2 border-black inline-block font-black"
                        >
                          <option value="admin">ADMIN (Root)</option>
                          <option value="analyst">ANALYST (Full RAG)</option>
                          <option value="viewer">VIEWER (Read-Only)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHATBOT SECURITY FEED */}
      {activeAdminTab === 'security' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-black uppercase">
            <span>Live Chatbot Telemetry &amp; Google Source Audit</span>
            <button
              onClick={fetchSecurityFeed}
              className="neo-button-secondary text-xs py-1 px-2.5"
            >
              REFRESH FEED
            </button>
          </div>

          <div className="space-y-2">
            {securityFeed.length === 0 ? (
              <div className="p-6 bg-zinc-50 border-2 border-black text-center text-xs sm:text-sm text-zinc-700 font-bold">
                No chatbot security queries recorded yet. Questions asked by Analysts or Admins will stream here with full Google/Local source attribution.
              </div>
            ) : (
              securityFeed.map((item, idx) => (
                <div key={idx} className="p-3 bg-[#FBFBFA] border-2 border-black space-y-1.5 text-xs sm:text-sm hover:border-black">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-200 pb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-black">{item.user_email || 'anonymous'}</span>
                      <span className={`neo-badge text-xs py-0 ${
                        item.details?.provider === 'google' ? 'bg-[#BAE6FD] text-black' : 'bg-zinc-100 text-black'
                      }`}>
                        AUTH: {item.details?.provider === 'google' ? 'GOOGLE WORKSPACE' : 'LOCAL'}
                      </span>
                      <span className="neo-badge-yellow text-xs py-0">
                        {item.details?.role?.toUpperCase() || 'USER'}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-800 font-sans font-bold">{item.timestamp?.replace('T', ' ').slice(0, 19)}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-sans font-semibold text-black">
                      <strong className="font-mono text-xs text-zinc-800 uppercase font-black">Question: </strong>
                      "{item.details?.question || 'N/A'}"
                    </div>
                    {item.details?.citation_pages && (
                      <div className="text-xs text-zinc-800 font-mono font-bold">
                        Citations Retrieved: Pages [{item.details.citation_pages.join(', ')}]
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeAdminTab === 'logs' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs sm:text-sm font-black text-black uppercase">
            <span>Cryptographic Security &amp; Access Log Trail</span>
            <span className="neo-badge text-xs bg-zinc-100 text-black">SHA-256 IMMUTABLE</span>
          </div>

          <div className="overflow-x-auto border-2 border-black max-h-96 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="neo-table-header">TIMESTAMP</th>
                  <th className="neo-table-header">ACTION</th>
                  <th className="neo-table-header">OPERATOR</th>
                  <th className="neo-table-header">DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-yellow-50/50">
                    <td className="neo-table-cell text-xs whitespace-nowrap font-bold text-black">
                      {log.timestamp?.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="neo-table-cell text-xs font-black uppercase text-black">
                      {log.action}
                    </td>
                    <td className="neo-table-cell text-xs sm:text-sm font-sans font-semibold text-zinc-900">
                      {log.user_email || 'System'}
                    </td>
                    <td className="neo-table-cell text-xs font-mono font-medium truncate max-w-xs text-zinc-900">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Teammate Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono">
          <div className="bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000000] max-w-md w-full p-5 space-y-4 relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 p-1 border-2 border-black bg-zinc-100 hover:bg-[#FFE600]"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="border-b-2 border-black pb-2.5 space-y-1">
              <span className="neo-badge-yellow text-[9px]">TEAM PROVISIONING</span>
              <h3 className="text-base font-black text-black uppercase">INVITE CORPORATE MEMBER</h3>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-black mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="neo-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-black mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="alex.m@finance.corp"
                  className="neo-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-black mb-1">
                  Assigned Clearance Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="neo-input cursor-pointer"
                >
                  <option value="analyst">Analyst (Full RAG &amp; Extraction)</option>
                  <option value="admin">Admin (Site-Wide Clearance)</option>
                  <option value="viewer">Viewer (Read-Only Clearance)</option>
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
                  {isInviting ? 'DISPATCHING...' : 'DISPATCH INVITATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
