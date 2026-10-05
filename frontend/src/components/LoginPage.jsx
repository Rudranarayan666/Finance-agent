import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  Zap,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('analyst@finance.corp');
  const [password, setPassword] = useState('AnalystPass123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('analyst');

  const isAdminEmail = email.toLowerCase().includes('admin');

  const handleAuthSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setForgotMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid corporate email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(cleanEmail, password);
        setIsLoading(false);
        try {
          confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
        } catch (e) {}
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      } else {
        // Register flow
        const finalRole = cleanEmail.includes('admin') ? 'admin' : selectedRole;
        await api.register(cleanEmail, password, fullName || cleanEmail.split('@')[0], finalRole);
        // Instant login after registration
        const res = await api.login(cleanEmail, password);
        setIsLoading(false);
        try {
          confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
        } catch (e) {}
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Authentication failed. Please verify your email and password.');
    }
  };

  const handleGoogleSignIn = async (role = 'analyst') => {
    setError(null);
    setForgotMsg(null);
    setIsLoading(true);

    try {
      const gEmail = role === 'admin' 
        ? 'admin.google@finance.corp' 
        : role === 'viewer'
        ? 'investor.google@finance.corp'
        : 'analyst.google@finance.corp';

      const gName = role === 'admin'
        ? 'Google Workspace Admin'
        : role === 'viewer'
        ? 'Google Institutional Viewer'
        : 'Google Senior Analyst';

      const res = await api.googleLogin(gEmail, gName, role);
      setIsLoading(false);

      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch (e) {}

      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Google OAuth verification failed.');
    }
  };

  const handlePresetSelect = (roleKey) => {
    setError(null);
    setForgotMsg(null);
    if (roleKey === 'admin') {
      setEmail('admin@finance.corp');
      setPassword('AdminPass123!');
      setSelectedRole('admin');
    } else if (roleKey === 'analyst') {
      setEmail('analyst@finance.corp');
      setPassword('AnalystPass123!');
      setSelectedRole('analyst');
    } else {
      setEmail('viewer@finance.corp');
      setPassword('ViewerPass123!');
      setSelectedRole('viewer');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4 font-mono text-zinc-900">
      
      {/* Light Neo-Brutalism Login Box */}
      <div className="w-full max-w-md bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000000] p-6 sm:p-7 space-y-5 relative">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-4 text-center space-y-1.5">
          <div className="w-10 h-10 bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_0px_#000] mx-auto flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-black tracking-tight uppercase">
            FINANCEAGENT PORTAL
          </h1>
          <p className="text-[11px] text-zinc-600 font-sans">
            Enterprise RBAC Authentication &bull; Verifiable Financial Audit
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => handleGoogleSignIn(selectedRole)}
          disabled={isLoading}
          className="neo-button-secondary w-full justify-center py-2.5 bg-white hover:bg-zinc-50 border-2 border-black font-extrabold shadow-[3px_3px_0px_0px_#000000]"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>CONTINUE WITH GOOGLE WORKSPACE</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="h-[2px] bg-black flex-1" />
          <span className="text-[10px] font-black uppercase text-zinc-500">OR CORPORATE CREDENTIALS</span>
          <div className="h-[2px] bg-black flex-1" />
        </div>

        {/* Tab toggle: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 border-2 border-black">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-1.5 text-xs font-bold uppercase transition ${
              mode === 'login'
                ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-1.5 text-xs font-bold uppercase transition ${
              mode === 'register'
                ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Admin Detection Indicator */}
        {isAdminEmail && (
          <div className="p-2.5 bg-[#FFF9C4] border-2 border-black text-xs space-y-1 animate-in fade-in">
            <div className="font-black text-black flex items-center gap-1.5 uppercase text-[11px]">
              <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
              <span>ADMIN ACCESS DETECTED:</span>
            </div>
            <p className="text-[10px] text-zinc-700 font-sans">
              Email contains "admin" &bull; Site-wide administrative clearance, user provisioning &amp; audit oversight enabled.
            </p>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-2.5 bg-[#FEE2E2] border-2 border-black text-xs text-rose-900 flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span className="font-sans font-semibold text-[11px]">{error}</span>
          </div>
        )}

        {forgotMsg && (
          <div className="p-2.5 bg-[#E0F2FE] border-2 border-black text-xs text-blue-900 flex items-start space-x-2 animate-in fade-in">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span className="font-sans font-semibold text-[11px]">{forgotMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-black uppercase text-black mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Analyst"
                className="neo-input"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-black mb-1">
              Corporate Email (use "admin" for Root Access)
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@finance.corp"
                className="neo-input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black uppercase text-black">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setForgotMsg(`Password recovery instructions dispatched to ${email || 'your email'}.`)}
                  className="text-[10px] text-zinc-600 hover:text-black underline font-bold"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="neo-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-black"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-black uppercase text-black mb-1">
                Requested Role Tier
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="neo-input cursor-pointer"
              >
                <option value="analyst">Analyst (RAG, Extraction, DuckDB)</option>
                <option value="admin">Admin (Full Control, Audits, All Docs)</option>
                <option value="viewer">Viewer (Read-Only Access)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="neo-button-primary w-full justify-center py-2.5 text-xs font-black shadow-[3px_3px_0px_0px_#000000] mt-1"
          >
            {isLoading ? 'VERIFYING CREDENTIALS...' : mode === 'login' ? 'SIGN IN WITH CREDENTIALS' : 'CREATE ACCOUNT & ENTER'}
          </button>
        </form>

        {/* 1-Click Demo Evaluation Presets */}
        <div className="pt-3 border-t-2 border-black space-y-2">
          <div className="text-[10px] font-black uppercase text-zinc-500 text-center tracking-wider">
            1-CLICK EVALUATION PRESETS:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePresetSelect('admin')}
              className="neo-button-secondary text-[11px] py-1.5 justify-center bg-[#FFF9C4] hover:bg-[#FFE600] font-black"
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('analyst')}
              className="neo-button-secondary text-[11px] py-1.5 justify-center bg-[#E0F2FE] hover:bg-[#BAE6FD] font-black"
            >
              ANALYST
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('viewer')}
              className="neo-button-secondary text-[11px] py-1.5 justify-center bg-[#F4F4F5] hover:bg-zinc-200 font-black"
            >
              VIEWER
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
