import React, { useState } from 'react';
import { FileText, ShieldCheck, Quote, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';

export default function ExecutiveInterpretation({ interpretation, onInspectCitation, companyName }) {
  const [selectedClaimIdx, setSelectedClaimIdx] = useState(null);

  if (!interpretation) {
    return null;
  }

  const { summary_text, claims = [] } = interpretation;

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 shadow-xl shadow-black/40">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              Grounded Executive Interpretation
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic synthesis reasoning exclusively from verified citations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400" />
            100% Grounded
          </span>
        </div>
      </div>

      {/* Main ~300-word Summary */}
      <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed font-normal bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 shadow-inner">
        <p className="whitespace-pre-line">{summary_text}</p>
      </div>

      {/* Grounded Claims List */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Quote className="w-3.5 h-3.5 text-emerald-400" />
            <span>Key Executive Claims & Citations ({claims.length})</span>
          </h3>

          <div className="space-y-2.5">
            {claims.map((item, idx) => {
              const isSelected = selectedClaimIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedClaimIdx(isSelected ? null : idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-700">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-100">
                          {item.claim}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.supporting_metric_fields?.map((f) => (
                            <span key={f} className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                              {f}
                            </span>
                          ))}
                          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                            Source: Page {item.source_page}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-400 mt-1">
                      {onInspectCitation && item.supporting_quote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectCitation({
                              title: `Executive Claim #${idx + 1}`,
                              field: item.supporting_metric_fields?.join(', ') || 'executive_claim',
                              value: item.claim,
                              page: item.source_page,
                              quote: item.supporting_quote,
                              confidence: 'high',
                              method: 'grounded_synthesis',
                              company: companyName
                            });
                          }}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition"
                          title="Open Citation Inspector"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Supporting Verbatim Quote */}
                  {isSelected && item.supporting_quote && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 animate-in fade-in duration-150">
                      <div className="p-3.5 rounded-xl bg-black/70 border border-emerald-500/20 font-mono text-[11px] text-slate-300">
                        <span className="text-emerald-400 font-bold block mb-1">
                          Verbatim PDF Supporting Evidence (Page {item.source_page}):
                        </span>
                        <p className="italic text-emerald-200/90">"{item.supporting_quote}"</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
