import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  BarChart3, 
  LogOut, 
  Sparkles, 
  Lock, 
  MessageSquare, 
  Shield, 
  ChevronDown,
  Building2
} from 'lucide-react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab, onOpenAuth }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>;
      case 'analyst':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Analyst</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">Viewer</span>;
      default:
        return null;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'FA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="border-b border-slate-800/90 bg-[#070b16]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center space-x-2.5 cursor-pointer flex-shrink-0" 
          onClick={() => setActiveTab('visualizations')}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-emerald-950">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                FinanceAgent
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 hidden xs:inline">
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Central Navigation Tabs (Desktop only: hidden on screens < 768px where bottom tab bar takes over) */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80">
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
              <span>Documents</span>
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

        {/* Top-Right Consolidated Avatar Dropdown Block */}
        <div className="flex items-center space-x-2 flex-shrink-0" ref={dropdownRef}>
          {user ? (
            <div className="relative flex items-center space-x-2">
              {/* Role Badge Chip visible next to avatar */}
              <div className="shrink-0">
                {getRoleBadge(user.role)}
              </div>

              {/* Avatar trigger button */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1.5 p-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                title="Account Menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                  {getInitials(user.full_name)}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Dropdown Card */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-11 mt-2 w-64 rounded-2xl bg-[#0c1220] border border-slate-700/90 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1 pb-3 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white truncate">{user.full_name}</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-xs text-slate-400 truncate font-mono">{user.email}</div>
                    <div className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium pt-1">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{user.organization_name || 'FinanceCorp Global'}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                    <span>Provider:</span>
                    <span className="capitalize text-slate-400">{user.provider || 'local'}</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-semibold flex items-center justify-center space-x-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
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
