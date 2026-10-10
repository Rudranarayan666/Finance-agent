import React from 'react';
import { 
  Settings, 
  User, 
  Building2, 
  Shield, 
  CheckCircle2, 
  Key, 
  Lock, 
  Cpu, 
  Database,
  FileCode,
  Sparkles
} from 'lucide-react';

export default function SettingsView({ user, onLogout }) {
  return (
    <div className="space-y-6 font-mono text-zinc-950">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-black pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2">
            <Settings className="w-7 h-7 stroke-[2.5]" />
            <span>ACCOUNT &amp; PLATFORM SYSTEM SETTINGS</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-800 font-bold mt-1">
            USER PROFILE &bull; ORGANIZATION SCOPE &bull; SYSTEM HEALTH &amp; RBAC MATRIX
          </p>
        </div>

        <button
          onClick={onLogout}
          className="neo-button-danger text-xs sm:text-sm self-start sm:self-auto"
        >
          <span>SIGN OUT OF SESSION</span>
        </button>
      </div>

      {/* Grid: Profile & Organization Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card */}
        <div className="neo-card bg-white space-y-4">
          <div className="flex items-center space-x-2 border-b-2 border-black pb-3">
            <User className="w-5 h-5 text-black stroke-[2.5]" />
            <h2 className="text-base font-black text-black">USER PROFILE</h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">FULL NAME:</span>
              <span className="text-black font-black text-sm sm:text-base">{user?.full_name || 'N/A'}</span>
            </div>

            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">CORPORATE EMAIL:</span>
              <span className="text-black font-bold font-sans text-sm sm:text-base">{user?.email || 'N/A'}</span>
            </div>

            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">WORKSPACE PLAN:</span>
              <span className="neo-badge bg-[#FFE600] text-black mt-1 uppercase">
                {user?.plan_name || 'BASIC CUSTOMER'}
              </span>
            </div>

            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">AUTHENTICATION PROVIDER:</span>
              <span className="neo-badge bg-zinc-100 text-black mt-1">
                {user?.provider === 'google' ? 'GOOGLE WORKSPACE' : 'LOCAL EMAIL'}
              </span>
            </div>
          </div>
        </div>

        {/* Organization Card */}
        <div className="neo-card bg-white space-y-4">
          <div className="flex items-center space-x-2 border-b-2 border-black pb-3">
            <Building2 className="w-5 h-5 text-black stroke-[2.5]" />
            <h2 className="text-base font-black text-black">ORGANIZATION TENANT</h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">ORGANIZATION NAME:</span>
              <span className="text-black font-black text-sm sm:text-base">{user?.organization_name || 'FinanceCorp Global'}</span>
            </div>

            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">ORGANIZATION ID:</span>
              <span className="text-black font-mono font-bold text-xs sm:text-sm block truncate mt-1 bg-zinc-100 p-1 border border-black">
                {user?.organization_id || 'org_default_tenant'}
              </span>
            </div>

            <div>
              <span className="text-zinc-800 font-black block uppercase text-xs">ISOLATION POLICY:</span>
              <span className="neo-badge bg-[#BAE6FD] text-black mt-1">
                MULTI-TENANT STRICT SCOPED
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* System Engine Health & Security Status */}
      <div className="neo-card bg-[#FFF9C4] p-6 space-y-4 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
        <h2 className="text-base font-black text-black flex items-center gap-2">
          <Shield className="w-5 h-5 stroke-[2.5]" />
          <span>SYSTEM ENGINE HEALTH &amp; SECURITY STATUS</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
            <span className="text-xs text-zinc-800 font-black block uppercase">SHA-256 SEALS</span>
            <span className="text-xs sm:text-sm font-black text-black flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-700 stroke-[3]" />
              ACTIVE / SEALED
            </span>
          </div>

          <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
            <span className="text-xs text-zinc-800 font-black block uppercase">LANGGRAPH RAG</span>
            <span className="text-xs sm:text-sm font-black text-black flex items-center gap-1 mt-1">
              <Cpu className="w-4 h-4 text-black stroke-[2.5]" />
              DETERMINISTIC GRAPH
            </span>
          </div>

          <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
            <span className="text-xs text-zinc-800 font-black block uppercase">DATABASE POOL</span>
            <span className="text-xs sm:text-sm font-black text-black flex items-center gap-1 mt-1">
              <Database className="w-4 h-4 text-black stroke-[2.5]" />
              DUCKDB + SQLITE
            </span>
          </div>

          <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
            <span className="text-xs text-zinc-800 font-black block uppercase">SECURITY FEED</span>
            <span className="text-xs sm:text-sm font-black text-black flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-700 stroke-[3]" />
              AUDIT ACTIVE
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Plan Quotas & Capabilities Matrix */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-black flex items-center gap-2">
          <Zap className="w-5 h-5 stroke-[2.5]" />
          <span>WORKSPACE PLAN CAPACITIES &amp; FEATURE MATRIX</span>
        </h2>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr>
                <th className="neo-table-header">Feature / Quota</th>
                <th className="neo-table-header">BASIC (Free)</th>
                <th className="neo-table-header">PRO (₹299/mo)</th>
                <th className="neo-table-header">PREMIUM (₹799/mo)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-yellow-50/50">
                <td className="neo-table-cell font-bold text-black">Active Filing Documents</td>
                <td className="neo-table-cell font-bold text-zinc-700">2 Documents</td>
                <td className="neo-table-cell font-bold text-zinc-900">10 Documents</td>
                <td className="neo-table-cell font-bold text-black">50 Documents</td>
              </tr>
              <tr className="hover:bg-yellow-50/50">
                <td className="neo-table-cell font-bold text-black">Monthly Compute Credits</td>
                <td className="neo-table-cell font-bold text-zinc-700">100 credits/mo</td>
                <td className="neo-table-cell font-bold text-zinc-900">500 credits/mo</td>
                <td className="neo-table-cell font-bold text-black">2,000 credits/mo</td>
              </tr>
              <tr className="hover:bg-yellow-50/50">
                <td className="neo-table-cell font-bold text-black">RAG Questions per Filing</td>
                <td className="neo-table-cell font-bold text-zinc-700">5 questions cap</td>
                <td className="neo-table-cell font-bold text-zinc-900">10 questions cap</td>
                <td className="neo-table-cell font-bold text-black">20 questions cap</td>
              </tr>
              <tr className="hover:bg-yellow-50/50">
                <td className="neo-table-cell font-bold text-black">Multi-Year Filing Comparisons</td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#FF6B6B] text-black">NO</span></td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#BBF7D0] text-black">INCLUDED</span></td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#BBF7D0] text-black">INCLUDED</span></td>
              </tr>
              <tr className="hover:bg-yellow-50/50">
                <td className="neo-table-cell font-bold text-black">Executive Report Downloads (PDF/JSON)</td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#FF6B6B] text-black">LOCKED</span></td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#BBF7D0] text-black">UNLIMITED</span></td>
                <td className="neo-table-cell"><span className="neo-badge bg-[#BBF7D0] text-black">UNLIMITED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
