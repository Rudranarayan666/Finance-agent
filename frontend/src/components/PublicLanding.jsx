import React from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  Cpu, 
  BarChart3, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Database,
  Building2,
  FileSpreadsheet,
  HelpCircle,
  KeyRound,
  Zap,
  Layers,
  Search,
  Sparkles,
  Users
} from 'lucide-react';

export default function PublicLanding({ onOpenAuth, onSelectRolePreset }) {
  const handleQuickPreset = (role) => {
    if (onSelectRolePreset) {
      onSelectRolePreset(role);
    } else if (onOpenAuth) {
      onOpenAuth(role);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 font-mono">
      
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="neo-card bg-white border-3 shadow-[6px_6px_0px_0px_#000000] p-6 sm:p-10 space-y-6 text-center">
          
          <div className="inline-flex items-center gap-2 neo-badge bg-[#FFE600] text-black border-2 border-black font-extrabold text-xs">
            <Zap className="w-3.5 h-3.5 stroke-[3]" />
            <span>AGENTIC RAG &bull; DUCKDB ANALYTICS &bull; 100% VERIFIABLE CITATIONS</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-black uppercase tracking-tight leading-tight max-w-4xl mx-auto">
            DETERMINISTIC FINANCIAL INTELLIGENCE WITH <span className="bg-[#FFE600] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_#000]">PAGE REDIRECT CITATIONS</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-700 max-w-2xl mx-auto leading-relaxed font-sans">
            FinanceAgent eliminates LLM hallucinations in SEC 10-K/10-Q filings. Powered by multi-agent chunking, RRF reranking, vectorized DuckDB analytics, and strict 3-tier Role-Based Access Control.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onOpenAuth && onOpenAuth()}
              className="neo-button-primary text-xs sm:text-sm px-6 py-2.5"
            >
              <span>ACCESS FINANCIAL PORTAL</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={() => handleQuickPreset('analyst')}
              className="neo-button-secondary text-xs sm:text-sm px-5 py-2.5"
            >
              <KeyRound className="w-4 h-4 stroke-[2.5]" />
              <span>TEST ANALYST DEMO</span>
            </button>
          </div>

          {/* 3-Tier RBAC Presets Bar */}
          <div className="pt-6 border-t-2 border-black max-w-2xl mx-auto">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest block mb-2.5">
              // ROLE-BASED ACCESS CONTROL (RBAC) PRESETS:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickPreset('admin')}
                className="neo-card bg-[#FFF9C4] hover:bg-[#FFE600] p-3 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="neo-badge-yellow text-[10px]">FULL ADMIN</span>
                  <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div className="text-xs font-black text-black uppercase">ADMIN ACCESS</div>
                <div className="text-[10px] text-zinc-600 font-sans mt-0.5">
                  Full site rights &bull; Audit logs &bull; Unlimited RAG &bull; DuckDB SQL
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('analyst')}
                className="neo-card bg-[#E0F2FE] hover:bg-[#BAE6FD] p-3 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="neo-badge-blue text-[10px]">ANALYST</span>
                  <BarChart3 className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div className="text-xs font-black text-black uppercase">ANALYST ACCESS</div>
                <div className="text-[10px] text-zinc-600 font-sans mt-0.5">
                  Multi-agent extraction &bull; RAG Q&A &bull; Citations &bull; Visuals
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset('viewer')}
                className="neo-card bg-[#F4F4F5] hover:bg-zinc-200 p-3 text-left transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="neo-badge text-[10px]">READ ONLY</span>
                  <Lock className="w-4 h-4 text-black stroke-[2.5]" />
                </div>
                <div className="text-xs font-black text-black uppercase">VIEWER ACCESS</div>
                <div className="text-[10px] text-zinc-600 font-sans mt-0.5">
                  Browse filings &bull; Pre-computed metrics &bull; Chatbot protected
                </div>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="neo-card bg-white space-y-2">
            <div className="w-9 h-9 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-sm font-black text-black uppercase">1. VERIFIABLE PAGE CITATIONS</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              Every answer delivers exact 1-indexed page links, substring quotes, and direct page redirects so auditors can confirm figures in seconds.
            </p>
          </div>

          <div className="neo-card bg-white space-y-2">
            <div className="w-9 h-9 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <Database className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-sm font-black text-black uppercase">2. DUCKDB VECTORIZED ANALYTICS</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              Ultra-low latency in-memory DuckDB query engine computes YoY revenue growth, profit margin breakdowns, and solvency ratios in &lt; 2ms.
            </p>
          </div>

          <div className="neo-card bg-white space-y-2">
            <div className="w-9 h-9 bg-[#FFE600] border-2 border-black flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h3 className="text-sm font-black text-black uppercase">3. AGENTIC RAG & RERANKING</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">
              Multi-tier semantic chunking, financial synonym expansion, and Reciprocal Rank Fusion (RRF) produce concise, factual answers without bloat.
            </p>
          </div>

        </div>
      </section>

      {/* Security & Access Overview */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="neo-card bg-[#FFFDE7] border-3 shadow-[4px_4px_0px_0px_#000000] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div>
              <span className="neo-badge bg-[#FFE600] text-black font-extrabold text-[10px]">
                ENTERPRISE GOVERNANCE SPECIFICATION
              </span>
              <h2 className="text-base font-black text-black uppercase mt-1">
                THREE-TIER ROLE ENFORCEMENT & SECURITY MATRIX
              </h2>
            </div>
            <button
              onClick={() => onOpenAuth && onOpenAuth()}
              className="neo-button-primary text-xs"
            >
              LAUNCH CONSOLE
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 font-mono text-xs">
            <div className="p-3 bg-white border-2 border-black space-y-1">
              <span className="neo-badge-yellow text-[10px]">ADMINISTRATOR</span>
              <p className="text-[11px] text-zinc-800 font-sans pt-1">
                Emails containing <code className="bg-zinc-100 px-1 border border-black text-black font-bold">admin</code> receive immediate root rights: user provisioning, organization management, raw DuckDB SQL execution, and live audit telemetry.
              </p>
            </div>

            <div className="p-3 bg-white border-2 border-black space-y-1">
              <span className="neo-badge-blue text-[10px]">EQUITY ANALYST</span>
              <p className="text-[11px] text-zinc-800 font-sans pt-1">
                Full permission to upload SEC filings, trigger multi-agent LangGraph analysis, run grounded Agentic RAG Q&amp;A with citations, and review visualization suites.
              </p>
            </div>

            <div className="p-3 bg-white border-2 border-black space-y-1">
              <span className="neo-badge text-[10px]">PORTFOLIO VIEWER</span>
              <p className="text-[11px] text-zinc-800 font-sans pt-1">
                Read-only clearance. View verified financial cards, executive summaries, and charts. AI chatbot querying and file deletions are locked to preserve audit safety.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
