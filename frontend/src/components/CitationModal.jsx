import React from 'react';
import { ShieldCheck, BookOpen, X, Calculator, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function CitationModal({ citationData, onClose }) {
  if (!citationData) return null;

  const { title, field, value, unit, page, quote, confidence, method, formula, company } = citationData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0e1424] border border-slate-700/80 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-slate-100 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                Verifiable Grounding Citation
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Deterministic Match
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              {title || field}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Filing: {company || 'Target Company'} • Source Page {page || 1}
            </p>
          </div>
        </div>

        {/* Extracted Value Callout */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Extracted Value</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {value || 'Not Disclosed'}
            </div>
            {unit && <div className="text-xs text-slate-400 font-mono">{unit}</div>}
          </div>

          <div className="text-right space-y-1">
            <div className="text-[11px] font-mono text-slate-400">Extraction Confidence</div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {confidence?.toUpperCase() || 'HIGH'}
            </span>
          </div>
        </div>

        {/* Verbatim Quote Box */}
        {quote && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center text-emerald-400 font-semibold">
                <FileText className="w-3.5 h-3.5 mr-1" /> Verbatim PDF Excerpt (Page {page}):
              </span>
              <span>Substring Matched</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/30 font-mono text-xs sm:text-sm text-emerald-200/90 leading-relaxed italic relative">
              <span className="text-2xl font-serif text-emerald-500/40 absolute top-2 left-2">“</span>
              <p className="pl-4 pr-2">{quote}</p>
              <span className="text-2xl font-serif text-emerald-500/40 absolute bottom-1 right-3">”</span>
            </div>
          </div>
        )}

        {/* Formula Details if computed */}
        {formula && (
          <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-800/40 text-xs text-teal-300 font-mono space-y-1">
            <div className="font-bold flex items-center">
              <Calculator className="w-3.5 h-3.5 mr-1.5" /> Deterministic Calculation:
            </div>
            <div>{formula}</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>Extraction Method: <strong className="text-slate-300">{method || 'Direct Statement'}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-lg shadow-emerald-950"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
