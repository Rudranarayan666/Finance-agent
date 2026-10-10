import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  FileSpreadsheet,
  Shield, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Menu, 
  X, 
  TrendingUp,
  Building2,
  Lock,
  Zap,
  CreditCard
} from 'lucide-react';
import CreditMeter from './CreditMeter';

export default function Navbar({ 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  onOpenAuth,
  creditData,
  onRefreshCredits
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
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isAdmin = user && (user.is_admin || user.role === 'admin');

  const navItems = user ? [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'research', label: 'AI Chat', icon: MessageSquare },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'pricing', label: 'Plans', icon: Zap },
    ...(isAdmin ? [
      { id: 'admin-platform', label: 'Admin', icon: Shield },
      { id: 'audit-logs', label: 'Audit', icon: Shield }
    ] : []),
    { id: 'settings', label: 'Settings', icon: Settings }
  ] : [];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b-2 border-black bg-white sticky top-0 z-50 font-mono shadow-[0_3px_0px_0px_#000]">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
        
        {/* Brand */}
        <button 
          onClick={() => handleNavClick(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 focus:outline-none group cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 stroke-[3]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-base tracking-wider text-black uppercase group-hover:text-amber-600 transition leading-none">
              FINANCEAGENT
            </span>
            <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase leading-none mt-0.5">
              AGENTIC RAG · DUCKDB
            </span>
          </div>
        </button>

        {/* Central Nav (Desktop) */}
        {user && (
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 text-xs font-extrabold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isActive
                      ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-transparent text-zinc-600 border-transparent hover:border-black hover:bg-zinc-100 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <CreditMeter 
                user={user} 
                creditData={creditData} 
                onRefreshCredits={onRefreshCredits} 
                onOpenPricing={() => handleNavClick('pricing')} 
              />

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 bg-white border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 bg-[#FFE600] text-black font-extrabold text-xs flex items-center justify-center border border-black">
                    {getInitials(user.full_name)}
                  </div>
                  <span className="hidden sm:inline text-sm font-bold text-black max-w-[140px] truncate">
                    {user.full_name || user.email}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-white border-2 border-black shadow-[5px_5px_0px_0px_#000] p-3 space-y-2 z-50 text-left">
                    <div className="pb-2 border-b-2 border-black space-y-0.5">
                      <p className="text-sm font-black text-black truncate">{user.full_name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      {user.organization_name && (
                        <div className="flex items-center gap-1 text-xs text-zinc-700 pt-0.5 font-bold">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate">{user.organization_name}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => { setIsDropdownOpen(false); handleNavClick('pricing'); }}
                      className="w-full text-left text-sm font-bold text-black hover:bg-yellow-50 py-2 px-2 flex items-center gap-2 transition border-b border-zinc-100"
                    >
                      <CreditCard className="w-4 h-4 stroke-[2]" />
                      <span>Plans &amp; Credits</span>
                    </button>

                    <button
                      onClick={() => { setIsDropdownOpen(false); onLogout(); }}
                      className="w-full text-left text-sm font-bold text-rose-600 hover:text-rose-900 py-2 px-2 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4 stroke-[2]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="neo-button-secondary text-xs py-2 px-4 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth && onOpenAuth('register')}
                className="neo-button-primary text-xs py-2 px-4 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 stroke-[3]" />
                <span>Sign Up Free</span>
              </button>
            </div>
          )}

          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 border-2 border-black bg-white hover:bg-zinc-100 text-black cursor-pointer shadow-[2px_2px_0px_0px_#000]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Dropdown */}
      {user && isMobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-black bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 text-sm font-bold uppercase flex items-center gap-2 border-2 ${
                  isActive
                    ? 'bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'bg-white text-zinc-700 border-transparent hover:border-black hover:text-black'
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
