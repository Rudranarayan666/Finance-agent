import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  Filter, 
  RotateCcw, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  Lock,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function AuditLogsView({ user }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter States
  const [filterAction, setFilterAction] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDocId, setFilterDocId] = useState('');

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
    if (user?.role === 'admin') {
      fetchLogs();
    }
  }, [user]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetFilters = () => {
    setFilterAction('');
    setFilterEmail('');
    setFilterDocId('');
    api.getAuditLogs({ limit: 100 }).then(setAuditLogs);
  };

  // RBAC Server-side Enforcement Guard
  if (user?.role !== 'admin') {
    return (
      <div className="neo-card bg-[#FEE2E2] border-2 border-black shadow-[4px_4px_0px_0px_#000] p-8 text-center space-y-3 font-mono">
        <div className="w-12 h-12 bg-rose-500 text-black border-2 border-black font-extrabold mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 stroke-[3]" />
        </div>
        <div>
          <h2 className="text-base font-black text-black">403 ACCESS DENIED &bull; ADMIN CLEARANCE REQUIRED</h2>
          <p className="text-xs text-zinc-700 font-sans mt-1 max-w-md mx-auto">
            Audit logs contain corporate compliance records and are restricted to Organization Administrators (`ADMIN`). Your current role is `{user?.role?.toUpperCase()}`.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-zinc-900">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-black flex items-center gap-2">
            <Shield className="w-5 h-5 stroke-[2.5]" />
            <span>IMMUTABLE AUDIT LOGS &bull; COMPLIANCE TRAIL</span>
          </h1>
          <p className="text-[11px] text-zinc-600 font-sans">
            Cryptographic Event Auditing &bull; Scoped to {user?.organization_name?.toUpperCase() || 'FINANCECORP'}
          </p>
        </div>

        <span className="neo-badge-yellow text-[10px] self-start sm:self-auto">
          {auditLogs.length} EVENTS RECORDED
        </span>
      </div>

      {/* Filter Bar Form */}
      <form onSubmit={handleApplyFilters} className="neo-card bg-white p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black text-black uppercase flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>FILTER AUDIT TRAIL</span>
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[10px] font-bold text-zinc-600 hover:text-black flex items-center gap-1 uppercase cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] font-black text-black uppercase block mb-0.5">ACTION</label>
            <input
              type="text"
              placeholder="upload, query, login..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="neo-input text-[11px] py-1"
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-black uppercase block mb-0.5">USER EMAIL</label>
            <input
              type="text"
              placeholder="user@finance.corp..."
              value={filterEmail}
              onChange={(e) => setFilterEmail(e.target.value)}
              className="neo-input text-[11px] py-1"
            />
          </div>

          <div>
            <label className="text-[9px] font-black text-black uppercase block mb-0.5">DOCUMENT ID</label>
            <div className="flex space-x-1.5">
              <input
                type="text"
                placeholder="doc_..."
                value={filterDocId}
                onChange={(e) => setFilterDocId(e.target.value)}
                className="neo-input text-[11px] py-1"
              />
              <button
                type="submit"
                className="neo-button-primary text-xs px-3 py-1"
              >
                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Audit Log Table */}
      <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="neo-table-header text-[10px]">TIMESTAMP</th>
              <th className="neo-table-header text-[10px]">OPERATOR EMAIL</th>
              <th className="neo-table-header text-[10px]">ACTION EXECUTED</th>
              <th className="neo-table-header text-[10px]">TARGET DOCUMENT</th>
              <th className="neo-table-header text-[10px]">IP ADDRESS</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-yellow-50/40">
                  <td className="neo-table-cell text-zinc-600 text-[10px] whitespace-nowrap">
                    {log.timestamp?.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="neo-table-cell text-black font-extrabold text-[11px]">
                    {log.user_email || 'System'}
                  </td>
                  <td className="neo-table-cell">
                    <span className={`neo-badge text-[9px] py-0 ${
                      log.action.includes('admin')
                        ? 'bg-[#FFE600] text-black font-black'
                        : log.action.includes('chat')
                        ? 'bg-[#BAE6FD] text-black'
                        : log.action === 'upload'
                        ? 'bg-[#BBF7D0] text-black'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="neo-table-cell text-zinc-600 text-[10px] max-w-[140px] truncate">
                    {log.document_id ? log.document_id : '—'}
                  </td>
                  <td className="neo-table-cell text-zinc-600 text-[10px]">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="neo-table-cell text-center py-8 text-zinc-500 font-sans text-xs">
                  {isLoading ? 'FETCHING AUDIT TRAIL...' : 'NO AUDIT RECORDS FOUND MATCHING FILTER.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
