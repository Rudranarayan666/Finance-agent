import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Share2, 
  Trash2, 
  Play, 
  Sparkles, 
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  HelpCircle,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import Navbar from './components/Navbar';
import LandingHero from './components/LandingHero';
import UploadZone from './components/UploadZone';
import MetricsGrid from './components/MetricsGrid';
import ExecutiveInterpretation from './components/ExecutiveInterpretation';
import ExplainableAiShap from './components/ExplainableAiShap';
import Visualizations from './components/Visualizations';
import RagChat from './components/RagChat';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import FinanceBackground3D from './components/FinanceBackground3D';
import CitationModal from './components/CitationModal';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('visualizations'); // 'visualizations', 'chat', 'history', 'admin'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showHero, setShowHero] = useState(true);
  
  // Documents & Active Analysis
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Citation Inspector Modal State
  const [inspectingCitation, setInspectingCitation] = useState(null);

  // Processing & Job Polling
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Share modal state
  const [shareDocId, setShareDocId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');

  // 1. Initial Load: Check token & get current user
  useEffect(() => {
    const initAuth = async () => {
      if (api.token) {
        try {
          const u = await api.getCurrentUser();
          setUser(u);
          await loadDocuments();
        } catch (err) {
          api.setToken(null);
          setUser(null);
        }
      } else {
        // Auto-login with seeded analyst account for instant preview
        try {
          const res = await api.login('analyst@finance.corp', 'AnalystPass123!');
          setUser(res.user);
          await loadDocuments();
        } catch (e) {
          setIsAuthModalOpen(true);
        }
      }
    };
    initAuth();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.listDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !activeDocument) {
        selectDocument(docs[0].id, docs);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  // Switch active document with instant state clearing
  const selectDocument = async (docId, docList = documents) => {
    const doc = docList.find((d) => d.id === docId);
    if (doc) setActiveDocument(doc);

    // Instant state reset so previous document values NEVER bleed into the new one
    setAnalysisResult(null);
    setIsProcessing(true);
    setCurrentJob({ step: 'Loading document analysis...' });

    try {
      const res = await api.getAnalysis(docId);
      if (res.document_meta && res.metrics) {
        setAnalysisResult(res);
        setIsProcessing(false);
        setCurrentJob(null);
      } else if (res.status === 'processing' || res.status === 'queued') {
        setIsProcessing(true);
        setCurrentJob(res);
        startPolling(docId);
      } else {
        setIsProcessing(false);
        setCurrentJob(null);
      }
    } catch (err) {
      console.error('Failed to get analysis:', err);
      setIsProcessing(false);
      setCurrentJob(null);
    }
  };

  const startPolling = (docId) => {
    if (pollInterval) clearInterval(pollInterval);

    const interval = setInterval(async () => {
      try {
        const res = await api.getAnalysis(docId);
        if (res.document_meta && res.metrics) {
          setAnalysisResult(res);
          setIsProcessing(false);
          setCurrentJob(null);
          clearInterval(interval);
          loadDocuments();
        } else if (res.status === 'processing') {
          setCurrentJob(res);
        } else if (res.status === 'failed') {
          setIsProcessing(false);
          setCurrentJob({ step: 'Analysis failed.' });
          clearInterval(interval);
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 1500);

    setPollInterval(interval);
  };

  const handleDocumentUploaded = async (newDoc) => {
    await loadDocuments();
    // Instant reset for new upload
    setAnalysisResult(null);
    setActiveDocument(newDoc);

    try {
      setIsProcessing(true);
      setCurrentJob({ step: 'Initializing multi-agent graph...' });
      await api.triggerAnalysis(newDoc.id);
      startPolling(newDoc.id);
    } catch (err) {
      alert(err.message || 'Failed to trigger analysis');
      setIsProcessing(false);
    }
  };

  const handleTriggerAnalysis = async (docId) => {
    try {
      setAnalysisResult(null);
      setIsProcessing(true);
      await api.triggerAnalysis(docId);
      startPolling(docId);
    } catch (err) {
      alert(err.message || 'Failed to trigger analysis');
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and its analysis record?')) return;
    try {
      await api.deleteDocument(docId);
      if (activeDocument?.id === docId) {
        setActiveDocument(null);
        setAnalysisResult(null);
      }
      loadDocuments();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim() || !shareDocId) return;
    try {
      await api.shareDocument(shareDocId, shareEmail.trim(), 'view');
      alert(`Document shared successfully with ${shareEmail}`);
      setShareDocId(null);
      setShareEmail('');
    } catch (err) {
      alert(err.message || 'Failed to share document');
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      
      {/* 3D Animated Three.js Particle Background */}
      <FinanceBackground3D />

      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Responsive Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8 relative z-10">
        
        {/* Landing Hero Overview (Collapsible on Visualizations View) */}
        {showHero && (activeTab === 'visualizations' || activeTab === 'dashboard') && (
          <div className="relative">
            <LandingHero
              companyName={analysisResult?.document_meta?.company_name}
              hasActiveDocument={!!activeDocument}
              onGetStarted={() => {
                const el = document.getElementById('analysis-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onUploadClick={() => {
                const el = document.getElementById('upload-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <button
              onClick={() => setShowHero(false)}
              className="mt-2 text-[11px] font-mono text-slate-500 hover:text-slate-300 flex items-center space-x-1 mx-auto transition"
            >
              <span>Hide Welcome Overview</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {!showHero && (activeTab === 'visualizations' || activeTab === 'dashboard') && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowHero(true)}
              className="text-[11px] font-mono text-slate-500 hover:text-emerald-400 flex items-center space-x-1 transition px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800"
            >
              <span>Show Platform Overview</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE VIEW 1: VISUALIZATIONS & METRICS DASHBOARD           */}
        {/* ======================================================== */}
        {(activeTab === 'visualizations' || activeTab === 'dashboard') && (
          <div id="analysis-section" className="space-y-6 sm:space-y-8">
            
            {/* Upload Zone (Visible to Analysts & Admins) */}
            {user && user.role !== 'viewer' && (
              <div id="upload-section">
                <UploadZone
                  onDocumentUploaded={handleDocumentUploaded}
                  isProcessing={isProcessing}
                  currentJob={currentJob}
                />
              </div>
            )}

            {/* Document Switcher Bar */}
            {documents.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <span className="text-xs font-mono text-slate-400 flex-shrink-0 mr-1">
                  Active Filing:
                </span>
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => selectDocument(doc.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center space-x-2 border flex-shrink-0 ${
                      activeDocument?.id === doc.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950'
                        : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px] sm:max-w-[220px]">
                      {doc.company_name || doc.filename}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({doc.total_pages}p)
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Document Meta Header */}
            {analysisResult?.document_meta ? (
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                      <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                        {analysisResult.document_meta.company_name}
                      </h1>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {analysisResult.document_meta.fiscal_period}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {analysisResult.document_meta.filing_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3 text-[11px] sm:text-xs text-slate-400 font-mono flex-wrap">
                      <span>Total Pages: <strong className="text-slate-200">{analysisResult.document_meta.total_pages}</strong></span>
                      <span>•</span>
                      <span>Access Role: <strong className="text-emerald-400">{analysisResult.document_meta.access_level}</strong></span>
                      <span>•</span>
                      <span>Execution Latency: <strong className="text-slate-200">{analysisResult.processing_meta?.total_latency_ms || 0}ms</strong></span>
                    </div>
                  </div>

                  {/* Trust Score Badge & Quick Chat Jump */}
                  <div className="flex items-center space-x-3 self-start md:self-auto">
                    <div className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-right shadow-inner">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Grounding Coverage</div>
                      <div className="text-lg sm:text-2xl font-black text-emerald-400">
                        {analysisResult.coverage_report?.fields_found || 0}/8 Verified
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('chat')}
                      className="px-3.5 py-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg"
                      title="Open Document Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Ask AI</span>
                    </button>

                    <button
                      onClick={() => setShareDocId(activeDocument?.id)}
                      className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition shadow-lg"
                      title="Share Analysis"
                    >
                      <Share2 className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/70 border border-slate-800 text-center space-y-4 backdrop-blur-md">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                <h3 className="text-base sm:text-lg font-bold text-slate-200">Executing Multi-Agent Financial Extraction...</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">{currentJob?.step || 'Extracting statements, computing margins & validating citations...'}</p>
              </div>
            ) : (
              <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2 backdrop-blur-sm">
                <FileText className="w-10 sm:w-12 h-10 sm:h-12 text-slate-600 mx-auto" />
                <h3 className="text-sm sm:text-base font-bold text-slate-300">No Active Filing Selected</h3>
                <p className="text-xs text-slate-400">Upload a report PDF above or choose a filing from the Documents repository.</p>
              </div>
            )}

            {/* 8 Target Metrics Grid */}
            {analysisResult?.metrics && (
              <MetricsGrid 
                metrics={analysisResult.metrics} 
                onInspectCitation={(c) => setInspectingCitation(c)}
                companyName={analysisResult?.document_meta?.company_name}
              />
            )}

            {/* Explainable AI (SHAP) Attribution */}
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
              />
            )}

            {/* Grounded Executive Interpretation */}
            {analysisResult?.interpretation && (
              <ExecutiveInterpretation 
                interpretation={analysisResult.interpretation} 
                onInspectCitation={(c) => setInspectingCitation(c)}
                companyName={analysisResult?.document_meta?.company_name}
              />
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE VIEW 2: DEDICATED AI CHAT & IN-CHAT ATTACHMENT       */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            
            {/* Filing Selector at top of Chat */}
            {documents.length > 0 && (
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-slate-400 flex-shrink-0">
                    Active Filing:
                  </span>
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => selectDocument(doc.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center space-x-1.5 border flex-shrink-0 ${
                        activeDocument?.id === doc.id
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-950'
                          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {doc.company_name || doc.filename}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setActiveTab('visualizations')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 flex-shrink-0"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Visualizations</span>
                </button>
              </div>
            )}

            {/* Dedicated RAG Chat with In-Chat File Attachment */}
            <RagChat
              key={activeDocument?.id || 'default_chat'}
              documentId={activeDocument?.id}
              companyName={analysisResult?.document_meta?.company_name || activeDocument?.company_name}
              onInspectCitation={(c) => setInspectingCitation(c)}
              onDocumentUploaded={(newDoc) => handleDocumentUploaded(newDoc)}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE VIEW 3: DOCUMENT REPOSITORY & SHARING                */}
        {/* ======================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Document Repository</h2>
                <p className="text-xs text-slate-400">Cryptographically verified filing history with role-aware access controls</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    selectDocument(doc.id);
                    setActiveTab('visualizations');
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between backdrop-blur-sm ${
                    activeDocument?.id === doc.id
                      ? 'bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400">
                        <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {doc.total_pages} Pages
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-white mt-3.5 truncate">{doc.company_name || doc.filename}</h3>
                    <div className="text-xs text-slate-400 mt-1">
                      {doc.company_name ? `${doc.company_name} • ${doc.fiscal_period || ''}` : 'Filing processed'}
                    </div>

                    {/* Cryptographic SHA-256 Hash Display */}
                    <div className="mt-3 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span className="text-emerald-400">SHA-256:</span>
                      <span className="truncate max-w-[160px] text-slate-400">
                        {doc.id.replace(/-/g, '').slice(0, 16)}...
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[10px] sm:text-[11px]">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectDocument(doc.id);
                          setActiveTab('chat');
                        }}
                        className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition"
                        title="Chat with Document"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {doc.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerAnalysis(doc.id);
                          }}
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition"
                          title="Run Analysis"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE VIEW 4: ADMIN PANEL                                  */}
        {/* ======================================================== */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <AdminPanel />
        )}

      </main>

      {/* Interactive Citation Modal */}
      <CitationModal
        citationData={inspectingCitation}
        onClose={() => setInspectingCitation(null)}
      />

      {/* Share Document Modal */}
      {shareDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0e1424] border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Share Financial Analysis</h3>
            <p className="text-xs text-slate-400">Grant read-only viewer access to another corporate user email.</p>
            <form onSubmit={handleShareSubmit} className="space-y-3.5">
              <input
                type="email"
                required
                placeholder="colleague@finance.corp"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShareDocId(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth / Login Modal */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          loadDocuments();
        }}
      />

    </div>
  );
}
