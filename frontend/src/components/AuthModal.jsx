import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, onLoginSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const isAdminEmail = email.toLowerCase().includes('admin');

  const handleSuccessCallback = (user) => {
    if (onLoginSuccess) onLoginSuccess(user);
    else if (onAuthSuccess) onAuthSuccess(user);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const gRole = isAdminEmail ? 'admin' : role;
      const res = await api.googleLogin(
        isAdminEmail ? 'admin.google@finance.corp' : 'google.analyst@finance.corp',
        isAdminEmail ? 'Google Workspace Admin' : 'Google Workspace Analyst',
        gRole
      );
      handleSuccessCallback(res.user);
      onClose();
    } catch (err) {
      setError('Google Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    if (mode !== 'forgot' && password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(cleanEmail, password);
        handleSuccessCallback(res.user);
        onClose();
      } else if (mode === 'register') {
        const finalRole = cleanEmail.includes('admin') ? 'admin' : role;
        await api.register(cleanEmail, password, fullName || cleanEmail.split('@')[0], finalRole);
        // Direct login upon account registration
        const res = await api.login(cleanEmail, password);
        handleSuccessCallback(res.user);
        onClose();
      } else if (mode === 'forgot') {
        setSuccessMsg(`If an account exists for ${cleanEmail}, password reset instructions have been sent.`);
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = async (presetRole) => {
    setError(null);
    setLoading(true);
    const presets = {
      analyst: { email: 'analyst@finance.corp', pass: 'AnalystPass123!' },
      admin: { email: 'admin@finance.corp', pass: 'AdminPass123!' },
      viewer: { email: 'viewer@finance.corp', pass: 'ViewerPass123!' }
    };
    const cred = presets[presetRole];
    try {
      const res = await api.login(cred.email, cred.pass);
      handleSuccessCallback(res.user);
      onClose();
    } catch (err) {
      setError(`Preset login error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-mono text-zinc-900">
      <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000000] max-w-md w-full p-6 text-black relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black p-1 border-2 border-black bg-zinc-100 hover:bg-[#FFE600] transition"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Modal Title */}
        <div className="mb-4 pb-3 border-b-2 border-black">
          <div className="neo-badge-yellow mb-1.5 text-[10px]">
            <Lock className="w-3 h-3 stroke-[3]" />
            <span>ROLE-BASED ACCESS CONTROL (RBAC)</span>
          </div>
          <h2 className="text-lg font-black text-black uppercase tracking-wider">
            {mode === 'forgot' ? 'RESET PASSWORD' : 'PORTAL AUTHENTICATION'}
          </h2>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="neo-card-emerald p-2.5 mb-3 text-xs font-bold text-green-950 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
            <span className="font-sans text-[11px]">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 bg-[#FEE2E2] border-2 border-black text-rose-950 mb-3 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
            <span className="font-sans text-[11px]">{error}</span>
          </div>
        )}

        {/* Admin detection hint */}
        {isAdminEmail && (
          <div className="p-2 bg-[#FFF9C4] border-2 border-black text-[11px] text-black font-sans mb-3 flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Administrator access granted automatically for this email address.</span>
          </div>
        )}

        {mode !== 'forgot' && (
          <>
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="neo-button-secondary w-full justify-center py-2.5 mb-3 bg-white hover:bg-zinc-50 border-2 border-black font-extrabold shadow-[2px_2px_0px_0px_#000]"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>SIGN IN WITH GOOGLE</span>
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="h-[2px] bg-black flex-1" />
              <span className="text-[10px] font-black uppercase text-zinc-500">OR CORPORATE EMAIL</span>
              <div className="h-[2px] bg-black flex-1" />
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-1 mb-3 bg-zinc-100 border-2 border-black p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`py-1 text-xs font-bold uppercase transition ${
                  mode === 'login' ? 'bg-[#FFE600] text-black font-extrabold border-2 border-black shadow-[2px_2px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-1 text-xs font-bold uppercase transition ${
                  mode === 'register' ? 'bg-[#FFE600] text-black font-extrabold border-2 border-black shadow-[2px_2px_0px_0px_#000]' : 'text-zinc-600 hover:text-black'
                }`}
              >
                REGISTER
              </button>
            </div>
          </>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {mode === 'register' && (
            <div>
              <label className="text-[10px] font-black text-black uppercase block mb-1">FULL NAME:</label>
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
            <label className="text-[10px] font-black text-black uppercase block mb-1">
              {mode === 'forgot' ? 'ACCOUNT EMAIL:' : 'CORPORATE EMAIL:'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@finance.corp"
              className="neo-input"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="text-[10px] font-black text-black uppercase block mb-1">PASSWORD:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="neo-input"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="text-[10px] font-black text-black uppercase block mb-1">ACCESS TIER:</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="neo-input cursor-pointer"
              >
                <option value="analyst">Analyst (Extraction &amp; RAG)</option>
                <option value="admin">Admin (Site-Wide Control &amp; Audits)</option>
                <option value="viewer">Viewer (Read-Only Access)</option>
              </select>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => setMode('forgot')}
                className="text-[10px] font-bold text-zinc-600 hover:text-black underline"
              >
                FORGOT PASSWORD?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-button-primary w-full justify-center py-2.5 text-xs font-black shadow-[3px_3px_0px_0px_#000] mt-1"
          >
            {loading ? 'PROCESSING...' : mode === 'login' ? 'SIGN IN WITH CREDENTIALS' : mode === 'register' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
          </button>
          
          {mode === 'forgot' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode('login')}
              className="neo-button-secondary w-full justify-center py-2 text-xs"
            >
              BACK TO SIGN IN
            </button>
          )}

        </form>

        {/* Quick Role Presets */}
        {mode === 'login' && (
          <div className="mt-4 pt-3 border-t-2 border-black">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5 text-center">
              QUICK DEMO PRESETS:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset('admin')}
                className="neo-button-secondary text-[11px] py-1 justify-center bg-[#FFF9C4] font-black"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('analyst')}
                className="neo-button-secondary text-[11px] py-1 justify-center bg-[#E0F2FE] font-black"
              >
                ANALYST
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('viewer')}
                className="neo-button-secondary text-[11px] py-1 justify-center bg-[#F4F4F5] font-black"
              >
                VIEWER
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
