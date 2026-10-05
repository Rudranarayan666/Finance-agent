import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  FileSpreadsheet,
  Shield, 
  Users, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Menu, 
  X, 
  TrendingUp,
  Building2,
  Lock,
  UserCheck,
  Zap
} from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  onOpenAuth,
  onSwitchPresetRole
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'FA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Nav Items with RBAC Filtering
  const navItems = user ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'research', label: 'AI Chatbot', icon: MessageSquare },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    ...(user.role === 'admin' ? [
      { id: 'audit-logs', label: 'Audit Logs', icon: Shield },
      { id: 'team', label: 'Team', icon: Users }
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings }
  ] : [];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b-3 border-black bg-white sticky top-0 z-50 text-black font-mono shadow-[0_2px_0px_0px_#000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Brand Logo - Light Neo-Brutalist */}
        <button 
          onClick={() => handleNavClick(user ? 'dashboard' : 'landing')}
          className="flex items-center space-x-2.5 focus:outline-none group cursor-pointer"
        >
          <div className="w-8 h-8 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-black font-extrabold text-sm">
            <TrendingUp className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-black uppercase group-hover:text-amber-600 transition">
              FINANCEAGENT
            </span>
            <span className="text-[9px] text-zinc-600 font-black tracking-widest uppercase">
              // AGENTIC RAG &bull; DUCKDB
            </span>
          </div>
        </button>

        {/* Central Navigation Items (Desktop) */}
        {user ? (
          <nav className="hidden lg:flex items-center space-x-1 bg-[#F4F4F5] border-2 border-black p-0.5 shadow-[2px_2px_0px_0px_#000]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-2.5 py-1 border text-[11px] font-extrabold uppercase transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-transparent text-zinc-700 border-transparent hover:border-black hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        {/* Right Section: User Profile or Sign In */}
        <div className="flex items-center space-x-2.5">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 bg-white border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="w-5 h-5 bg-[#FFE600] text-black font-extrabold text-[10px] flex items-center justify-center border border-black">
                  {getInitials(user.full_name)}
                </div>
                <span className="hidden sm:inline text-xs font-extrabold text-black max-w-[120px] truncate">
                  {user.full_name || user.email}
                </span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.2 border border-black ${
                  user.role === 'admin' ? 'bg-[#FFE600] text-black' : user.role === 'analyst' ? 'bg-[#BAE6FD] text-black' : 'bg-[#E4E4E7] text-black'
                }`}>
                  {user.role}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Neo-Brutalist Profile Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white border-3 border-black shadow-[5px_5px_0px_0px_#000] p-3 space-y-2.5 z-50 text-left animate-in fade-in">
                  <div className="pb-2.5 border-b-2 border-black space-y-1">
                    <p className="text-xs font-black text-black uppercase truncate">{user.full_name}</p>
                    <p className="text-[11px] text-zinc-600 truncate">{user.email}</p>
                    <div className="flex items-center space-x-1 text-[10px] text-zinc-800 pt-0.5 font-bold">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate">{user.organization_name || 'FinanceCorp Global'}</span>
                    </div>
                    <div className="pt-1 flex items-center gap-1">
                      <span className="text-[9px] font-black uppercase text-zinc-500">AUTH:</span>
                      <span className="neo-badge text-[9px] py-0 bg-zinc-100">
                        {user.provider === 'google' ? 'GOOGLE WORKSPACE' : 'LOCAL CREDENTIALS'}
                      </span>
                    </div>
                  </div>

                  {/* Preset Role Switcher for instant testing */}
                  {onSwitchPresetRole && (
                    <div className="space-y-1.5 pb-2 border-b border-zinc-200">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                        SWITCH EVALUATION ROLE:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => { onSwitchPresetRole('admin'); setIsDropdownOpen(false); }}
                          className={`py-1 text-[10px] font-extrabold uppercase border border-black ${
                            user.role === 'admin' ? 'bg-[#FFE600] text-black shadow-[1px_1px_0px_0px_#000]' : 'bg-white text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          ADMIN
                        </button>
                        <button
                          onClick={() => { onSwitchPresetRole('analyst'); setIsDropdownOpen(false); }}
                          className={`py-1 text-[10px] font-extrabold uppercase border border-black ${
                            user.role === 'analyst' ? 'bg-[#BAE6FD] text-black shadow-[1px_1px_0px_0px_#000]' : 'bg-white text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          ANALYST
                        </button>
                        <button
                          onClick={() => { onSwitchPresetRole('viewer'); setIsDropdownOpen(false); }}
                          className={`py-1 text-[10px] font-extrabold uppercase border border-black ${
                            user.role === 'viewer' ? 'bg-zinc-300 text-black shadow-[1px_1px_0px_0px_#000]' : 'bg-white text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          VIEWER
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left text-xs font-black text-rose-700 hover:text-rose-900 py-1.5 flex items-center space-x-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>SIGN OUT</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="neo-button-primary text-xs py-1.5 px-3.5"
            >
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>SIGN IN</span>
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 border-2 border-black bg-white hover:bg-zinc-100 text-black cursor-pointer shadow-[2px_2px_0px_0px_#000]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Menu Dropdown */}
      {user && isMobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-black bg-white p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2 text-xs font-black uppercase flex items-center space-x-2 border-2 ${
                  isActive
                    ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'bg-white text-zinc-800 border-transparent hover:border-black'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
