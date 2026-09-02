import React from 'react';
import { ShieldCheck, FileText, BarChart3, Users, LogOut, Sparkles, Lock, MessageSquare, Shield } from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab, onOpenAuth }) {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>;
      case 'analyst':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Analyst</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Viewer</span>;
      default:
        return null;
    }
  };

  return (
    <header className="border-b border-slate-800/90 bg-[#070b16]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0" onClick={() => setActiveTab('visualizations')}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-950">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                FinanceAgent
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 hidden xs:inline">
                v2.1
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Responsive) */}
        {user && (
          <nav className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 overflow-x-auto scrollbar-none">
            
            {/* Visualizations & Analytics */}
            <button
              onClick={() => setActiveTab('visualizations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'visualizations' || activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Visualizations</span>
            </button>

            {/* AI Chat & Attachment Q&A */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat & PDFs</span>
            </button>

            {/* Documents */}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </button>

            {/* Admin (Only for Admin Role) */}
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        )}

        {/* User Info & Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-right hidden md:block">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">{user.full_name}</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-end space-x-1">
                  <span className="truncate max-w-[130px]">{user.email}</span>
                  {getRoleBadge(user.role)}
                </div>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950 transition flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
