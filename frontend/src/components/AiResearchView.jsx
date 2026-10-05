import React from 'react';
import { 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  Search, 
  BarChart3, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  Sparkles,
  Paperclip
} from 'lucide-react';
import RagChat from './RagChat';

export default function AiResearchView({ 
  user, 
  documents, 
  activeDocument, 
  analysisResult, 
  selectDocument, 
  onInspectCitation, 
  onDocumentUploaded, 
  onNavigate 
}) {
  return (
    <div className="space-y-4 font-mono text-zinc-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-black flex items-center gap-2">
            <MessageSquare className="w-5 h-5 stroke-[2.5]" />
            <span>AGENTIC RAG RESEARCH WORKSPACE</span>
          </h1>
          <p className="text-[11px] text-zinc-600 font-sans">
            Retrieval-Augmented Financial Intelligence &bull; Reciprocal Rank Fusion &bull; Verifiable Page Redirection
          </p>
        </div>

        <button
          onClick={() => onNavigate('analysis')}
          className="neo-button-secondary text-xs self-start sm:self-auto"
        >
          <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>VIEW METRICS &amp; VISUALS</span>
        </button>
      </div>

      {/* Split-Screen Evidence-First Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Source Evidence Context Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="neo-card bg-[#FFF9C4] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="neo-badge-yellow text-xs">
                ACTIVE FILING
              </span>
              <span className="text-xs font-black text-black uppercase">
                {activeDocument?.fiscal_period || 'FY26'}
              </span>
            </div>

            {activeDocument ? (
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-black truncate">
                  {activeDocument.company_name || activeDocument.filename}
                </h3>
                <div className="text-xs sm:text-sm text-zinc-900 font-sans space-y-0.5">
                  <div>Pages: <strong>{activeDocument.total_pages} Pages</strong></div>
                  <div>Status: <span className="neo-badge-green text-xs py-0">{activeDocument.status?.toUpperCase()}</span></div>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-zinc-700 font-sans font-medium">No filing selected. Select one below.</p>
            )}

            {/* Document Switcher */}
            {documents.length > 0 && (
              <div className="pt-2 border-t border-black/20 space-y-1.5">
                <span className="text-xs uppercase font-black text-zinc-800 block">SWITCH FILING:</span>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => selectDocument(doc.id)}
                      className={`w-full text-left px-2.5 py-1.5 border text-xs sm:text-sm font-bold transition flex items-center justify-between cursor-pointer ${
                        activeDocument?.id === doc.id
                          ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-white text-zinc-900 border-black hover:bg-yellow-50'
                      }`}
                    >
                      <span className="truncate max-w-[140px] text-xs font-black">{doc.company_name || doc.filename}</span>
                      <span className="text-xs font-mono font-bold">({doc.total_pages}p)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Extracted Evidence Snippets */}
          {analysisResult?.metrics && (
            <div className="neo-card bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="neo-badge text-xs bg-zinc-100 text-black">
                  EXTRACTED EVIDENCE CITATIONS
                </span>
              </div>
              <p className="text-xs text-zinc-800 font-sans font-medium">
                Verified figures with exact page citations:
              </p>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {analysisResult.metrics.map((m) => (
                  <div key={m.field} className="p-2 bg-[#FBFBFA] border border-black text-xs sm:text-sm flex items-center justify-between gap-1">
                    <div className="truncate">
                      <span className="text-xs uppercase text-zinc-800 font-black block">{m.label || m.field}</span>
                      <span className="text-black font-black text-xs sm:text-sm">{m.value !== null ? String(m.value) : 'N/A'}</span>
                    </div>
                    {m.source?.page && (
                      <button
                        onClick={() => onInspectCitation({ 
                          title: m.label || m.field, 
                          page: m.source.page, 
                          quote: m.source.quote,
                          doc_id: activeDocument?.id,
                          value: m.value
                        })}
                        className="neo-badge-yellow text-xs py-0.5 px-2 cursor-pointer flex-shrink-0"
                      >
                        P.{m.source.page}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Guard Notice */}
          <div className="neo-card bg-white border-2 border-black p-3 text-xs sm:text-sm space-y-1">
            <span className="text-black font-black uppercase flex items-center gap-1 text-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>SECURITY &bull; AUDIT ISOLATION</span>
            </span>
            <p className="text-xs text-zinc-800 font-sans font-medium">
              Chatbot queries are logged to the administrator security feed with Google/Local identity attribution and prompt-injection defense.
            </p>
          </div>
        </div>

        {/* Right Column: RAG Research Chat Pane (8 cols) */}
        <div className="lg:col-span-8">
          <RagChat
            key={activeDocument?.id || 'default_research_chat'}
            documentId={activeDocument?.id}
            companyName={analysisResult?.document_meta?.company_name || activeDocument?.company_name}
            user={user}
            onInspectCitation={onInspectCitation}
            onDocumentUploaded={onDocumentUploaded}
          />
        </div>

      </div>
    </div>
  );
}
