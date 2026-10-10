import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Shield, 
  TrendingUp, 
  Zap, 
  Search, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  UserCheck, 
  UserX, 
  Settings, 
  DollarSign, 
  ArrowUpRight, 
  Loader2,
  X,
  Filter
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminPlatformView({ user }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'documents', 'audit'
  
  // Overview metrics state
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Credit adjustment modal
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustReason, setAdjustReason] = useState('Admin compensation grant');
  const [adjusting, setAdjusting] = useState(false);

  // Plan change modal
  const [planModalUser, setPlanModalUser] = useState(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState('pro');
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Documents state
  const [adminDocs, setAdminDocs] = useState([]);
  const [docQuery, setDocQuery] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditAction, setAuditAction] = useState('');
  const [auditEmail, setAuditEmail] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  const showNotification = (msg, isErr = false) => {
    setFeedback({ msg, isErr });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getAdminUsers(userQuery, userPlanFilter);
      setUsersList(data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const data = await api.getAdminDocuments(docQuery);
      setAdminDocs(data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getAuditLogs({ limit: 100, action: auditAction, userEmail: auditEmail });
      setAuditLogs(data || []);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAdjustCredits = async (e) => {
    e.preventDefault();
    if (!adjustModalUser) return;
    setAdjusting(true);
    try {
      const res = await api.adjustUserCredits(adjustModalUser.id, adjustAmount, adjustReason);
      showNotification(res.message);
      setAdjustModalUser(null);
      fetchUsers();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setAdjusting(false);
    }
  };

  const handleChangePlan = async (e) => {
    e.preventDefault();
    if (!planModalUser) return;
    setUpdatingPlan(true);
    try {
      const res = await api.changeUserPlanAdmin(planModalUser.id, selectedPlanKey);
      showNotification(res.message);
      setPlanModalUser(null);
      fetchUsers();
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleToggleSuspend = async (u) => {
    try {
      if (u.is_active) {
        await api.suspendUser(u.id);
        showNotification(`Account ${u.email} suspended.`);
      } else {
        await api.activateUser(u.id);
        showNotification(`Account ${u.email} reactivated.`);
      }
      fetchUsers();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleReindexDoc = async (docId) => {
    try {
      const res = await api.adminReindexDocument(docId);
      showNotification(res.message);
      fetchDocuments();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document across all indexes?')) return;
    try {
      const res = await api.adminDeleteDocument(docId);
      showNotification(res.message);
      fetchDocuments();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono text-black space-y-6 animate-in fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-3 border-black gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-[#FFE600] text-black">ADMIN CONTROL PLATFORM</span>
            <span className="text-[10px] font-black uppercase text-zinc-500">PROTECTED // RBAC SERVER ENFORCED</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-black mt-1">
            FinanceAgent SaaS Management
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 bg-zinc-100 border-2 border-black p-1 shadow-[2px_2px_0px_0px_#000]">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'users', label: 'User Directory', icon: Users },
            { id: 'documents', label: 'Document Library', icon: FileText },
            { id: 'audit', label: 'Audit Logs', icon: Shield }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 text-xs font-black uppercase flex items-center space-x-1.5 cursor-pointer transition ${
                  isActive 
                    ? 'bg-[#FFE600] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]' 
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3 border-2 border-black flex items-center justify-between shadow-[3px_3px_0px_0px_#000] ${
          feedback.isErr ? 'bg-rose-100 text-rose-950' : 'bg-emerald-100 text-emerald-950'
        }`}>
          <div className="flex items-center gap-2 text-xs font-black">
            {feedback.isErr ? <AlertTriangle className="w-4 h-4 text-rose-800" /> : <CheckCircle2 className="w-4 h-4 text-emerald-800" />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingOverview ? (
            <div className="p-12 text-center text-xs font-bold text-zinc-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading platform overview metrics...</span>
            </div>
          ) : overview ? (
            <>
              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                
                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">TOTAL USERS</span>
                  <p className="text-2xl font-black text-black">{overview.total_users}</p>
                  <span className="text-[9px] text-zinc-400 font-bold">Registered Accounts</span>
                </div>

                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">ACTIVE SUBSCRIPTIONS</span>
                  <p className="text-2xl font-black text-black">{overview.active_subscriptions}</p>
                  <span className="text-[9px] text-zinc-400 font-bold">Active Customer Tiers</span>
                </div>

                <div className="border-2 border-black bg-[#FFE600] p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-black">MRR (ESTIMATED)</span>
                  <p className="text-2xl font-black text-black">₹{overview.mrr_inr.toLocaleString()}</p>
                  <span className="text-[9px] text-zinc-800 font-bold">Monthly Recurring Rev</span>
                </div>

                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">TOTAL DOCUMENTS</span>
                  <p className="text-2xl font-black text-black">{overview.total_documents}</p>
                  <span className="text-[9px] text-zinc-400 font-bold">Indexed PDF Filings</span>
                </div>

                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">TOTAL QUESTIONS</span>
                  <p className="text-2xl font-black text-black">{overview.total_questions}</p>
                  <span className="text-[9px] text-zinc-400 font-bold">Successful RAG Inquiries</span>
                </div>

                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000] space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">CREDITS CONSUMED</span>
                  <p className="text-2xl font-black text-emerald-700">{overview.total_credits_consumed}</p>
                  <span className="text-[9px] text-zinc-400 font-bold">All-Time Billed Credits</span>
                </div>

              </div>

              {/* Tier Distribution & Events */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Plan Distribution Card */}
                <div className="border-3 border-black bg-white p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
                  <h3 className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>SUBSCRIPTION DISTRIBUTION</span>
                  </h3>
                  <div className="space-y-3 text-xs font-bold">
                    <div className="flex justify-between items-center p-2 border border-black bg-zinc-50">
                      <span>BASIC (FREE):</span>
                      <span className="font-black text-base">{overview.plan_distribution?.basic || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border border-black bg-yellow-50">
                      <span>PRO (₹299/mo):</span>
                      <span className="font-black text-base text-amber-700">{overview.plan_distribution?.pro || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border border-black bg-black text-white">
                      <span>PREMIUM (₹799/mo):</span>
                      <span className="font-black text-base text-[#FFE600]">{overview.plan_distribution?.premium || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Events Feed */}
                <div className="md:col-span-2 border-3 border-black bg-white p-5 shadow-[5px_5px_0px_0px_#000] space-y-4">
                  <h3 className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>RECENT SECURITY & SYSTEM EVENTS</span>
                  </h3>
                  <div className="max-h-64 overflow-y-auto divide-y divide-zinc-200 border border-black">
                    {overview.recent_events?.map((ev) => (
                      <div key={ev.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-black text-black uppercase">{ev.action}</p>
                          <p className="text-[10px] text-zinc-500 font-bold">{ev.user_email || 'System'}</p>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search user by email or name..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full pl-9 pr-3 py-2 border-2 border-black text-xs font-bold bg-white"
              />
            </div>
            <select
              value={userPlanFilter}
              onChange={(e) => {
                setUserPlanFilter(e.target.value);
              }}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-bold"
            >
              <option value="">All Subscription Plans</option>
              <option value="basic">Basic Tier</option>
              <option value="pro">Pro Tier</option>
              <option value="premium">Premium Tier</option>
            </select>
            <button
              onClick={fetchUsers}
              className="bg-[#FFE600] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              FILTER
            </button>
          </div>

          {/* Users Table */}
          <div className="border-3 border-black bg-white shadow-[5px_5px_0px_0px_#000] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FFE600] border-b-2 border-black text-black">
                <tr>
                  <th className="p-3 border-r border-black font-black uppercase">User</th>
                  <th className="p-3 border-r border-black font-black uppercase">Plan</th>
                  <th className="p-3 border-r border-black font-black uppercase">Credits</th>
                  <th className="p-3 border-r border-black font-black uppercase">Docs</th>
                  <th className="p-3 border-r border-black font-black uppercase">Role / Status</th>
                  <th className="p-3 font-black uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-bold">
                {loadingUsers ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-zinc-500">
                      Loading user records...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-zinc-500">
                      No matching user records found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="p-3 border-r border-black">
                        <p className="font-black text-black">{u.full_name}</p>
                        <p className="text-[10px] text-zinc-500">{u.email}</p>
                      </td>
                      <td className="p-3 border-r border-black">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${
                          u.plan_key === 'premium' ? 'bg-black text-white' : u.plan_key === 'pro' ? 'bg-[#FFE600] text-black' : 'bg-zinc-100 text-black'
                        }`}>
                          {u.plan_name}
                        </span>
                      </td>
                      <td className="p-3 border-r border-black font-black text-emerald-800">
                        {u.credits_balance} credits
                      </td>
                      <td className="p-3 border-r border-black">
                        {u.document_count} active
                      </td>
                      <td className="p-3 border-r border-black">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.2 border ${
                            u.is_admin ? 'bg-rose-100 text-rose-800 border-rose-600' : 'bg-zinc-100 text-zinc-800 border-zinc-400'
                          }`}>
                            {u.is_admin ? 'ADMIN' : u.role}
                          </span>
                          <span className={`text-[9px] font-bold ${u.is_active ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => setAdjustModalUser(u)}
                          className="bg-zinc-100 hover:bg-zinc-200 border border-black px-2 py-1 text-[10px] font-black uppercase cursor-pointer"
                        >
                          ADJUST CREDITS
                        </button>
                        <button
                          onClick={() => setPlanModalUser(u)}
                          className="bg-yellow-50 hover:bg-yellow-100 border border-black px-2 py-1 text-[10px] font-black uppercase cursor-pointer"
                        >
                          CHANGE PLAN
                        </button>
                        {!u.is_admin && (
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`border border-black px-2 py-1 text-[10px] font-black uppercase cursor-pointer ${
                              u.is_active ? 'bg-rose-50 text-rose-800 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'SUSPEND' : 'ACTIVATE'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: DOCUMENT MANAGEMENT */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search across all user documents..."
                value={docQuery}
                onChange={(e) => setDocQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
                className="w-full pl-9 pr-3 py-2 border-2 border-black text-xs font-bold bg-white"
              />
            </div>
            <button
              onClick={fetchDocuments}
              className="bg-[#FFE600] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              SEARCH
            </button>
          </div>

          <div className="border-3 border-black bg-white shadow-[5px_5px_0px_0px_#000] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FFE600] border-b-2 border-black text-black">
                <tr>
                  <th className="p-3 border-r border-black font-black uppercase">Document Filename</th>
                  <th className="p-3 border-r border-black font-black uppercase">Owner Email</th>
                  <th className="p-3 border-r border-black font-black uppercase">Pages / Size</th>
                  <th className="p-3 border-r border-black font-black uppercase">Status</th>
                  <th className="p-3 font-black uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-bold">
                {loadingDocs ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                      Loading documents across users...
                    </td>
                  </tr>
                ) : adminDocs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-zinc-500">
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  adminDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-50">
                      <td className="p-3 border-r border-black font-black">
                        {d.filename}
                      </td>
                      <td className="p-3 border-r border-black text-zinc-600">
                        {d.uploaded_by_email}
                      </td>
                      <td className="p-3 border-r border-black">
                        {d.total_pages} pages &bull; {Math.round(d.file_size_bytes / 1024)} KB
                      </td>
                      <td className="p-3 border-r border-black">
                        <span className="neo-badge bg-emerald-100 text-emerald-800 text-[10px]">
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleReindexDoc(d.id)}
                          className="bg-zinc-100 hover:bg-zinc-200 border border-black px-2 py-1 text-[10px] font-black uppercase cursor-pointer"
                        >
                          REINDEX
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(d.id)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-black px-2 py-1 text-[10px] font-black uppercase cursor-pointer"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Filter by action (e.g. upload, login, select_plan)..."
              value={auditAction}
              onChange={(e) => setAuditAction(e.target.value)}
              className="flex-1 p-2 border-2 border-black text-xs font-bold bg-white"
            />
            <input
              type="text"
              placeholder="Filter by user email..."
              value={auditEmail}
              onChange={(e) => setAuditEmail(e.target.value)}
              className="flex-1 p-2 border-2 border-black text-xs font-bold bg-white"
            />
            <button
              onClick={fetchAuditLogs}
              className="bg-[#FFE600] text-black border-2 border-black px-4 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              FILTER LOGS
            </button>
          </div>

          <div className="border-3 border-black bg-white shadow-[5px_5px_0px_0px_#000] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FFE600] border-b-2 border-black text-black">
                <tr>
                  <th className="p-3 border-r border-black font-black uppercase">Timestamp</th>
                  <th className="p-3 border-r border-black font-black uppercase">Action</th>
                  <th className="p-3 border-r border-black font-black uppercase">User</th>
                  <th className="p-3 font-black uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-bold">
                {loadingLogs ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-zinc-500">
                      Loading audit compliance records...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-zinc-500">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50">
                      <td className="p-3 border-r border-black text-zinc-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 border-r border-black font-black uppercase">
                        {log.action}
                      </td>
                      <td className="p-3 border-r border-black text-zinc-700">
                        {log.user_email || 'System'}
                      </td>
                      <td className="p-3 text-[11px] font-mono text-zinc-600 truncate max-w-xs">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Credits Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-black">
              <h3 className="text-sm font-black uppercase text-black">
                Adjust Credits: {adjustModalUser.email}
              </h3>
              <button onClick={() => setAdjustModalUser(null)}><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleAdjustCredits} className="space-y-4">
              <div>
                <label className="text-xs font-black block mb-1">
                  CREDITS AMOUNT (+ positive to grant, - negative to debit):
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full border-2 border-black p-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-black block mb-1">
                  AUDIT JUSTIFICATION / REASON:
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full border-2 border-black p-2 text-xs font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  className="bg-zinc-100 border-2 border-black px-3 py-1.5 text-xs font-black uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="bg-[#FFE600] border-2 border-black px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                  {adjusting ? 'SAVING...' : 'CONFIRM ADJUSTMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-black">
              <h3 className="text-sm font-black uppercase text-black">
                Change Subscription Plan: {planModalUser.email}
              </h3>
              <button onClick={() => setPlanModalUser(null)}><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleChangePlan} className="space-y-4">
              <div>
                <label className="text-xs font-black block mb-1">
                  SELECT TARGET PLAN:
                </label>
                <select
                  value={selectedPlanKey}
                  onChange={(e) => setSelectedPlanKey(e.target.value)}
                  className="w-full border-2 border-black p-2 text-xs font-bold bg-white"
                >
                  <option value="basic">BASIC (Free, 2 docs, 100 credits)</option>
                  <option value="pro">PRO (₹299, 10 docs, 500 credits)</option>
                  <option value="premium">PREMIUM (₹799, 50 docs, 2,000 credits)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModalUser(null)}
                  className="bg-zinc-100 border-2 border-black px-3 py-1.5 text-xs font-black uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={updatingPlan}
                  className="bg-[#FFE600] border-2 border-black px-4 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                  {updatingPlan ? 'UPDATING...' : 'CONFIRM PLAN CHANGE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
