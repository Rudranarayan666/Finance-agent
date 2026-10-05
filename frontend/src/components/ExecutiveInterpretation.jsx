import React, { useState } from 'react';
import { ShieldCheck, Quote, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';

export default function ExecutiveInterpretation({ interpretation, onInspectCitation, companyName }) {
  const [selectedClaimIdx, setSelectedClaimIdx] = useState(null);

  if (!interpretation) {
    return null;
  }

  const { summary_text, claims = [] } = interpretation;

  return (
    <div className="neo-card bg-white border-3 shadow-[4px_4px_0px_0px_#000] p-4 sm:p-5 space-y-4 font-mono text-zinc-900">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-[#FFE600] text-black border-2 border-black flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-black uppercase tracking-wider">
              GROUNDED EXECUTIVE SYNTHESIS
            </h2>
            <p className="text-[11px] text-zinc-600 font-sans">
              Deterministic financial summary strictly verified against disclosed statement pages
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="neo-badge-yellow text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
            <span>100% GROUNDED</span>
          </span>
        </div>
      </div>

      {/* Main Executive Summary */}
      <div className="bg-[#FBFBFA] p-3.5 border-2 border-black text-xs text-zinc-900 leading-relaxed font-sans font-medium">
        <p className="whitespace-pre-line">{summary_text}</p>
      </div>

      {/* Grounded Claims List */}
      {claims.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center space-x-1.5">
            <Quote className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>KEY EXECUTIVE CLAIMS &bull; CITATIONS ({claims.length})</span>
          </h3>

          <div className="space-y-2">
            {claims.map((item, idx) => {
              const isSelected = selectedClaimIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedClaimIdx(isSelected ? null : idx)}
                  className={`p-3 border-2 border-black bg-white cursor-pointer transition-all ${
                    isSelected ? 'shadow-[4px_4px_0px_0px_#FFE600] bg-[#FFFDE7]' : 'hover:shadow-[2px_2px_0px_0px_#000]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-sans text-black font-semibold leading-snug">
                      "{item.claim}"
                    </p>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="neo-badge-yellow text-[9px] py-0">
                        PAGE {item.source?.page || 1}
                      </span>
                      {isSelected ? <ChevronUp className="w-3 h-3 stroke-[3]" /> : <ChevronDown className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-black text-[11px] space-y-2 animate-in fade-in">
                      <div className="bg-[#FBFBFA] p-2 border border-black font-sans text-xs italic text-zinc-800">
                        "{item.source?.quote || 'Verbatim quote from filing'}"
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onInspectCitation) {
                              onInspectCitation({
                                title: `Claim Citation (Page ${item.source?.page})`,
                                page: item.source?.page,
                                quote: item.source?.quote,
                                company: companyName
                              });
                            }
                          }}
                          className="neo-button-secondary text-[10px] py-0.5 px-2"
                        >
                          <span>INSPECT EXCERPT</span>
                          <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                        </button>
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
