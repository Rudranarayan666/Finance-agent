import React from 'react';
import { 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Share2, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Clock,
  Sparkles 
} from 'lucide-react';
import MetricsGrid from './MetricsGrid';
import ExplainableAiShap from './ExplainableAiShap';
import Visualizations from './Visualizations';
import ExecutiveInterpretation from './ExecutiveInterpretation';

export default function AnalysisView({ 
  user, 
  documents, 
  activeDocument, 
  analysisResult, 
  isProcessing, 
  currentJob, 
  selectDocument, 
  onNavigate, 
  onInspectCitation, 
  onOpenShareModal 
}) {
  return (
    <div className="space-y-6 font-mono text-zinc-950">
      {/* Active Filing Switcher Header */}
      {documents.length > 1 && (
        <div className="neo-card bg-white p-3 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-black uppercase text-zinc-800 shrink-0">
            ACTIVE FILING:
          </span>
          <div className="flex items-center space-x-2">
            {documents.map((doc) => {
              const isSelected = activeDocument?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => selectDocument(doc.id)}
                  className={`neo-badge cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-white text-zinc-900 border-2 border-black hover:bg-yellow-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="truncate max-w-[140px] font-bold">{doc.company_name || doc.filename}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Document Meta Header */}
      {analysisResult?.document_meta ? (
        <div className="neo-card bg-[#FFF9C4] p-6 space-y-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span className="neo-badge bg-[#FFE600] text-black font-black">
                  {analysisResult.document_meta.fiscal_period || 'FY2023'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  {analysisResult.document_meta.company_name}
                </h1>
                <span className="neo-badge bg-white text-black font-black">
                  {analysisResult.document_meta.filing_type || '10-Q'}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs sm:text-sm font-bold text-zinc-800 flex-wrap">
                <span>PAGES: <strong className="text-black font-black">{analysisResult.document_meta.total_pages}</strong></span>
                <span>&bull;</span>
                <span>ACCESS: <strong className="text-black uppercase font-black">{analysisResult.document_meta.access_level || 'Org Scoped'}</strong></span>
                <span>&bull;</span>
                <span>LATENCY: <strong className="text-black font-black">{analysisResult.processing_meta?.total_latency_ms || 0}ms</strong></span>
              </div>
            </div>

            {/* Verification Trust Badge & Quick Actions */}
            <div className="flex items-center space-x-3 self-start md:self-auto">
              <div className="neo-card bg-white px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000] text-right">
                <div className="text-xs uppercase font-black text-zinc-800">GROUNDING SCORE</div>
                <div className="text-sm sm:text-base font-black text-black">
                  {analysisResult.coverage_report?.fields_found || 8} / 8 VERIFIED
                </div>
              </div>

              <button
                onClick={() => onNavigate('research')}
                className="neo-button-primary text-xs sm:text-sm"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                <span>ASK RAG AI</span>
              </button>

              <button
                onClick={() => onOpenShareModal(activeDocument?.id)}
                className="neo-button-secondary text-xs sm:text-sm px-3"
                title="Share Analysis"
              >
                <Share2 className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      ) : isProcessing ? (
        <div className="neo-card bg-[#FFF9C4] p-12 text-center space-y-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
          <div className="w-14 h-14 bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] mx-auto flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin stroke-[3]" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-black">EXECUTING MULTI-AGENT FINANCIAL GRAPH...</h3>
          <p className="text-xs sm:text-sm text-zinc-800 font-bold max-w-md mx-auto">
            {currentJob?.step || 'Extracting target metric statements, calculating quarter margins & building SHAP attribution...'}
          </p>
        </div>
      ) : (
        <div className="neo-card bg-white text-center py-16 space-y-3">
          <FileText className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="text-base font-black text-black">NO ACTIVE FILING ANALYSIS LOADED</h3>
          <p className="text-xs sm:text-sm text-zinc-700 font-bold">Upload a filing or select a document from the repository.</p>
        </div>
      )}

      {/* 8 Target Metrics Grid */}
      {analysisResult?.metrics && (
        <MetricsGrid 
          metrics={analysisResult.metrics} 
          chartData={analysisResult.chart_data}
          onInspectCitation={onInspectCitation}
          companyName={analysisResult?.document_meta?.company_name}
        />
      )}

      {/* Explainable AI SHAP Attribution */}
      {analysisResult?.shap_attribution && (
        <ExplainableAiShap
          shapData={analysisResult.shap_attribution}
          companyName={analysisResult?.document_meta?.company_name}
        />
      )}

      {/* Visualizations Suite */}
      {analysisResult?.chart_data && (
        <Visualizations
          chartData={analysisResult.chart_data}
          coverageReport={analysisResult.coverage_report}
          documentId={activeDocument?.id}
        />
      )}

      {/* Grounded Executive Interpretation */}
      {analysisResult?.interpretation && (
        <ExecutiveInterpretation 
          interpretation={analysisResult.interpretation} 
          onInspectCitation={onInspectCitation}
          companyName={analysisResult?.document_meta?.company_name}
        />
      )}

    </div>
  );
}
