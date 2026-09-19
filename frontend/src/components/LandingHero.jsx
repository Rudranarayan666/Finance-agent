import React from 'react';
import { 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp,
  Sparkles
} from 'lucide-react';
import FinanceBackground3D from './FinanceBackground3D';

export default function LandingHero({ onGetStarted, onUploadClick, hasActiveDocument, companyName }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 p-6 sm:p-8 shadow-xl">
      
      {/* Subtle 3D particle constellation */}
      <FinanceBackground3D />

      {/* Hero Content Panel */}
      <div className="relative z-10 space-y-4 max-w-3xl">
        
        {/* Subtle pill tag */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Agent Financial Intelligence</span>
        </div>

        {/* Headline */}
        <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
          Deterministic Financial Report Analysis,{' '}
          <span className="text-emerald-400">
            Backed by Verifiable Citations.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
          Automated statement extraction, arithmetic margin reconciliation, and additive SHAP attribution for 10-Q, 10-K, and multi-page earnings filings.
        </p>

        {/* Action Button */}
        <div className="pt-2 flex items-center space-x-3">
          {hasActiveDocument ? (
            <button
              onClick={onGetStarted}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center space-x-2 shadow-md shadow-emerald-950/50 group"
            >
              <span>Inspect {companyName || 'Active Filing'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={onUploadClick}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center space-x-2 shadow-md shadow-emerald-950/50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Upload Filing (PDF)</span>
            </button>
          )}

          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Deterministic Grounding • Blockchain SHA-256 Seal
          </span>
        </div>

      </div>
    </div>
  );
}
