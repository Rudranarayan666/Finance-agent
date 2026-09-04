import React from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  BrainCircuit, 
  FileText, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Zap, 
  CheckCircle2,
  Lock,
  ChevronDown
} from 'lucide-react';
import FinanceBackground3D from './FinanceBackground3D';

export default function LandingHero({ onGetStarted, onUploadClick, hasActiveDocument, companyName }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-800 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-8">
      
      {/* 3D Interactive Particle Field pinned strictly inside Hero at low opacity */}
      <FinanceBackground3D />

      {/* Background Decorative Ambient Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Hero Content Panel (elevated with z-10 so particles never intersect text or borders) */}
      <div className="relative z-10 space-y-8">

      {/* Top Banner Tag */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Next-Gen Multi-Agent Financial Intelligence</span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Daemon Active</span>
        </div>
      </div>

      {/* Main Headline & Subtitle */}
      <div className="max-w-3xl space-y-3">
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
          Audit-Grade Financial Intelligence,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Guaranteed Without Hallucinations.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
          Upload any 10-Q, 10-K, or 250+ page Annual Report. Our LangGraph supervisor coordinates specialized extraction agents, cross-validates conflict priorities, and links every single number to its exact page and verbatim quote.
        </p>
      </div>

      {/* Feature Pillar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
          <div className="p-2 w-fit rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-100">Multi-Agent LangGraph</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Supervisor routes chunks to Section, Financial, Guidance, and Risk specialist agents with auto-retries.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
          <div className="p-2 w-fit rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-100">Deterministic Grounding</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every metric is validated by exact substring search against the source page text before saving.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
          <div className="p-2 w-fit rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-100">Explainable AI (SHAP)</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Additive feature attribution breaking down organic volume, pricing power, and cost headwinds.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
          <div className="p-2 w-fit rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-100">Document-Scoped RAG</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Interactive natural-language Q&A strictly isolated to your document with instant verbatim citations.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        {hasActiveDocument ? (
          <button
            onClick={onGetStarted}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold tracking-wide transition shadow-xl shadow-emerald-950 flex items-center justify-center space-x-2 group"
          >
            <span>Inspect Active Report: {companyName || 'Corporate Filing'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button
            onClick={onUploadClick}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold tracking-wide transition shadow-xl shadow-emerald-950 flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Upload Earnings Report (PDF)</span>
          </button>
        )}

        <div className="text-[11px] text-slate-400 font-mono text-center sm:text-left self-center">
          Role-Based Access • SOC2 / Audit-Ready • Multi-Standard (US GAAP & Ind AS)
        </div>
      </div>

      </div>
    </div>
  );
}
