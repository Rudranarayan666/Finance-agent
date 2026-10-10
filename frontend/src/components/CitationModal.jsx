import React, { useState } from 'react';
import { BookOpen, X, Calculator, CheckCircle2, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import PdfSourceViewer from './PdfSourceViewer';

export default function CitationModal({ citationData, onClose }) {
  const [showFullPdfViewer, setShowFullPdfViewer] = useState(false);
  if (!citationData) return null;

  const { title, field, value, unit, page, quote, confidence, method, formula, company, doc_id } = citationData;

  const handleOpenPdfViewer = () => {
    setShowFullPdfViewer(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-zinc-900">
      <div 
        className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000000] w-full max-w-lg p-5 relative space-y-4 animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 bg-zinc-100 border-2 border-black hover:bg-[#FFE600] text-black transition"
        >
          <X className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3 pb-3 border-b-2 border-black">
          <div className="w-9 h-9 bg-[#FFE600] text-black border-2 border-black flex items-center justify-center font-bold flex-shrink-0">
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="neo-badge-yellow text-[9px]">
                VERIFIABLE GROUNDING CITATION
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-black uppercase mt-0.5">
              {title || field}
            </h3>
            <p className="text-xs text-zinc-800 font-sans font-medium">
              Filing: <strong>{company || 'Corporate Filing'}</strong> &bull; Source Page {page || 1}
            </p>
          </div>
        </div>

        {/* Extracted Value Callout */}
        <div className="neo-card bg-[#FBFBFA] border-2 border-black flex items-center justify-between p-3.5">
          <div>
            <div className="text-xs text-zinc-800 font-black uppercase">EXTRACTED VALUE</div>
            <div className="text-xl sm:text-2xl font-black text-black mt-0.5">
              {value || 'Not Disclosed'}
            </div>
            {unit && <div className="text-xs text-zinc-700 font-mono font-bold">{unit}</div>}
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-black text-zinc-800 uppercase">CONFIDENCE</div>
            <span className="neo-badge-green text-xs font-black">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
              {confidence?.toUpperCase() || 'HIGH'}
            </span>
          </div>
        </div>

        {/* Verbatim Quote Box */}
        {quote && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs uppercase text-zinc-800 font-black">
              <span className="flex items-center text-black">
                <FileText className="w-3.5 h-3.5 mr-1 stroke-[2.5]" /> VERBATIM EXCERPT (PAGE {page}):
              </span>
              <span className="text-zinc-800 font-black">SUBSTRING VERIFIED</span>
            </div>
            <div className="p-3 bg-[#FFFDE7] border-2 border-black font-sans text-xs sm:text-sm text-zinc-950 leading-relaxed italic font-medium">
              <p>"{quote}"</p>
            </div>
          </div>
        )}

        {/* Formula Details if computed */}
        {formula && (
          <div className="p-2.5 bg-blue-50 border-2 border-black text-xs text-blue-950 space-y-1">
            <div className="font-black flex items-center uppercase text-xs">
              <Calculator className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" /> DETERMINISTIC FORMULA:
            </div>
            <div className="font-mono text-xs sm:text-sm font-bold">{formula}</div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t-2 border-black text-xs sm:text-sm">
          {doc_id && page ? (
            <button
              onClick={handleOpenPdfViewer}
              className="neo-button-primary text-xs sm:text-sm py-1.5 px-3 flex items-center space-x-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>VERIFY IN PDF VIEWER (PAGE {page})</span>
              <ExternalLink className="w-3 h-3 stroke-[3]" />
            </button>
          ) : (
            <span className="text-xs text-zinc-800 font-sans font-medium">
              Method: <strong>{method || 'Direct Statement'}</strong>
            </span>
          )}

          <button
            onClick={onClose}
            className="neo-button-secondary text-xs sm:text-sm py-1.5 px-4 font-black"
          >
            CLOSE
          </button>
        </div>

      </div>

      {showFullPdfViewer && (
        <PdfSourceViewer
          citation={{
            document_id: doc_id,
            page: page,
            physical_page_number: page,
            quote: quote,
            snippet: quote,
            content_type: 'text'
          }}
          documentId={doc_id}
          companyName={company || 'Corporate Filing'}
          onClose={() => setShowFullPdfViewer(false)}
        />
      )}
    </div>
  );
}
