import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Share2, 
  Trash2, 
  Loader2, 
  X,
  ShieldAlert,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import Navbar from './components/Navbar';
import PublicLanding from './components/PublicLanding';
import AuthModal from './components/AuthModal';
import CitationModal from './components/CitationModal';
import DashboardView from './components/DashboardView';
import DocumentsView from './components/DocumentsView';
import AnalysisView from './components/AnalysisView';
import AiResearchView from './components/AiResearchView';
import ReportsView from './components/ReportsView';
import AuditLogsView from './components/AuditLogsView';
import TeamView from './components/TeamView';
import SettingsView from './components/SettingsView';
import PricingView from './components/PricingView';
import AdminPlatformView from './components/AdminPlatformView';
import PlanSelectionModal from './components/PlanSelectionModal';
import UpgradeModal from './components/UpgradeModal';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'documents', 'analysis', 'research', 'reports', 'pricing', 'admin-platform', 'audit-logs', 'team', 'settings'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // SaaS Subscription & Credits State
  const [creditData, setCreditData] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [upgradeModalState, setUpgradeModalState] = useState(null);

  // Documents & Active Analysis State
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Citation Inspector Modal State
  const [inspectingCitation, setInspectingCitation] = useState(null);

  // Processing & Job Polling State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Share Modal State
  const [shareDocId, setShareDocId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareWithEntireOrg, setShareWithEntireOrg] = useState(false);

  // Auth Modal State & Plan Pre-selection
  const [authMode, setAuthMode] = useState('login');
  const [pendingPlan, setPendingPlan] = useState(null);

  const handleOpenAuth = (mode = 'login', plan = null) => {
    setAuthMode(mode);
    setPendingPlan(plan);
    setIsAuthModalOpen(true);
  };

  const fetchCredits = async () => {
    if (!api.token) return;
    try {
      const data = await api.getMyCredits();
      setCreditData(data);
      return data;
    } catch (err) {
      console.warn('Credits fetch error:', err);
      return null;
    }
  };

  const handleLimitError = (err) => {
    const msg = typeof err === 'string' ? err : (err?.message || '');
    if (msg.includes('DOCUMENT_LIMIT_REACHED') || msg.toLowerCase().includes('document limit')) {
      setUpgradeModalState({
        reason: 'DOCUMENT_LIMIT',
        message: msg,
        planName: creditData?.subscription?.plan_name || user?.subscription?.plan_name || 'Basic'
      });
      return true;
    }
    if (msg.includes('INSUFFICIENT_CREDITS') || msg.toLowerCase().includes('insufficient credit')) {
      setUpgradeModalState({
        reason: 'INSUFFICIENT_CREDITS',
        message: msg,
        planName: creditData?.subscription?.plan_name || user?.subscription?.plan_name || 'Basic'
      });
      return true;
    }
    if (msg.includes('QUESTION_CAP_REACHED') || msg.toLowerCase().includes('question cap') || msg.toLowerCase().includes('question limit')) {
      setUpgradeModalState({
        reason: 'QUESTION_LIMIT',
        message: msg,
        planName: creditData?.subscription?.plan_name || user?.subscription?.plan_name || 'Basic'
      });
      return true;
    }
    return false;
  };

  // 1. Initial Load: Check token & get current user
  useEffect(() => {
    const initAuth = async () => {
      if (api.token) {
        try {
          const u = await api.getCurrentUser();
          setUser(u);
          const credits = await fetchCredits();
          await loadDocuments();

          // Check if user requires plan selection
          const isAdmin = u.is_admin || u.role === 'admin';
          const hasExistingPlan = Boolean(
            u.has_subscription || 
            u.plan_key || 
            (u.subscription && u.subscription.plan_id) || 
            credits?.plan_key
          );
          if (!isAdmin && !hasExistingPlan) {
            setShowPlanModal(true);
          }
        } catch (err) {
          api.setToken(null);
          setUser(null);
        }
      }
    };
    initAuth();

    const handleOpenPricing = () => setActiveTab('pricing');
    window.addEventListener('open-pricing', handleOpenPricing);
    return () => window.removeEventListener('open-pricing', handleOpenPricing);
  }, []);

  const handleLoginSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    setIsAuthModalOpen(false);

    const isAdmin = loggedInUser.is_admin || loggedInUser.role === 'admin';
    if (isAdmin) {
      await fetchCredits();
      await loadDocuments();
      setActiveTab('admin-platform');
      return;
    }

    if (pendingPlan) {
      try {
        await api.selectPlan(pendingPlan);
      } catch (err) {
        console.warn('Auto plan selection error:', err);
      }
      setPendingPlan(null);
    }

    const credits = await fetchCredits();
    const updatedUser = await api.getCurrentUser().catch(() => loggedInUser);
    setUser(updatedUser);
    await loadDocuments();

    const hasExistingPlan = Boolean(
      updatedUser.has_subscription || 
      updatedUser.plan_key || 
      (updatedUser.subscription && updatedUser.subscription.plan_id) || 
      credits?.plan_key
    );
    if (!hasExistingPlan) {
      setShowPlanModal(true);
    }
    setActiveTab('dashboard');
  };

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

    // Reset analysis result to prevent state bleeding
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
    await fetchCredits();
    setAnalysisResult(null);
    setActiveDocument(newDoc);
    // Re-fetch after 2s to catch async ledger write (backend may commit after response)
    setTimeout(fetchCredits, 2000);

    try {
      setIsProcessing(true);
      setCurrentJob({ step: 'Initializing multi-agent graph...' });
      await api.triggerAnalysis(newDoc.id);
      startPolling(newDoc.id);
      setActiveTab('analysis');
    } catch (err) {
      if (!handleLimitError(err)) {
        alert(err.message || 'Failed to trigger analysis');
      }
      setIsProcessing(false);
    }
  };

  const handleTriggerAnalysis = async (docId) => {
    try {
      setAnalysisResult(null);
      setIsProcessing(true);
      await api.triggerAnalysis(docId);
      startPolling(docId);
      setActiveTab('analysis');
    } catch (err) {
      if (!handleLimitError(err)) {
        alert(err.message || 'Failed to trigger analysis');
      }
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this filing and its analysis record?')) return;
    try {
      await api.deleteDocument(docId);
      if (activeDocument?.id === docId) {
        setActiveDocument(null);
        setAnalysisResult(null);
      }
      await loadDocuments();
      await fetchCredits();
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareDocId) return;
    try {
      if (shareWithEntireOrg) {
        await api.shareDocument(shareDocId, null, 'view', true);
        alert('Document shared with entire organization (Viewer access)!');
      } else {
        if (!shareEmail.trim()) return;
        await api.shareDocument(shareDocId, shareEmail.trim(), 'view', false);
        alert(`Document shared successfully with ${shareEmail.trim()}`);
      }
      setShareDocId(null);
      setShareEmail('');
      setShareWithEntireOrg(false);
      loadDocuments();
    } catch (err) {
      alert(err.message || 'Failed to share document');
    }
  };

  const handleSwitchPresetRole = (roleKey) => {
    if (user) {
      setUser({ ...user, role: roleKey });
    }
  };


  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  // 1. PUBLIC EXPERIENCE: Unauthenticated visitors see the Public Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 selection:bg-[#FFE600] selection:text-black">
        <Navbar
          user={null}
          onLogout={() => {}}
          activeTab="landing"
          setActiveTab={() => {}}
          onOpenAuth={handleOpenAuth}
        />

        <PublicLanding 
          onOpenAuth={handleOpenAuth}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authMode}
          selectedPlan={pendingPlan}
          onClose={() => {
            setIsAuthModalOpen(false);
            setPendingPlan(null);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // 2. PROTECTED EXPERIENCE: Authenticated Users Application Shell
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 flex flex-col selection:bg-[#FFE600] selection:text-black font-mono">

      {/* Top Neo-Brutalist Navigation Bar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
        onSwitchPresetRole={handleSwitchPresetRole}
        creditData={creditData}
        onRefreshCredits={fetchCredits}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            documents={documents}
            activeDocument={activeDocument}
            selectDocument={selectDocument}
            onNavigate={(tab) => setActiveTab(tab)}
            onDocumentUploaded={handleDocumentUploaded}
            isProcessing={isProcessing}
            currentJob={currentJob}
          />
        )}

        {/* VIEW 2: DOCUMENTS REPOSITORY */}
        {activeTab === 'documents' && (
          <DocumentsView
            user={user}
            documents={documents}
            activeDocument={activeDocument}
            selectDocument={selectDocument}
            onNavigate={(tab) => setActiveTab(tab)}
            onDocumentUploaded={handleDocumentUploaded}
            onDeleteDocument={handleDeleteDocument}
            onOpenShareModal={(id) => setShareDocId(id)}
            onTriggerAnalysis={handleTriggerAnalysis}
            isProcessing={isProcessing}
            currentJob={currentJob}
          />
        )}

        {/* VIEW 3: DETERMINISTIC ANALYSIS */}
        {activeTab === 'analysis' && (
          <AnalysisView
            user={user}
            documents={documents}
            activeDocument={activeDocument}
            analysisResult={analysisResult}
            isProcessing={isProcessing}
            currentJob={currentJob}
            selectDocument={selectDocument}
            onNavigate={(tab) => setActiveTab(tab)}
            onInspectCitation={(c) => setInspectingCitation(c)}
            onOpenShareModal={(id) => setShareDocId(id)}
          />
        )}

        {/* VIEW 4: AI RESEARCH WORKSPACE */}
        {activeTab === 'research' && (
          <AiResearchView
            user={user}
            documents={documents}
            activeDocument={activeDocument}
            analysisResult={analysisResult}
            selectDocument={selectDocument}
            onInspectCitation={(c) => setInspectingCitation(c)}
            onDocumentUploaded={handleDocumentUploaded}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefreshCredits={fetchCredits}
          />
        )}

        {/* VIEW 5: INTELLIGENCE REPORTS */}
        {activeTab === 'reports' && (
          <ReportsView
            user={user}
            documents={documents}
            activeDocument={activeDocument}
            analysisResult={analysisResult}
            selectDocument={selectDocument}
            onInspectCitation={(c) => setInspectingCitation(c)}
            subscription={creditData?.subscription || user?.subscription}
            onUpgradeClick={(data) => setUpgradeModalState(data)}
          />
        )}

        {/* VIEW 6: PLANS & PRICING */}
        {activeTab === 'pricing' && (
          <PricingView
            user={user}
            creditData={creditData}
            onPlanUpgraded={async () => {
              await fetchCredits();
              const u = await api.getCurrentUser();
              setUser(u);
              await loadDocuments();
            }}
          />
        )}

        {/* VIEW 7: DEDICATED ADMIN PLATFORM (ADMIN ONLY) */}
        {activeTab === 'admin-platform' && (user.is_admin || user.role === 'admin') && (
          <AdminPlatformView user={user} />
        )}

        {/* VIEW 8: AUDIT COMPLIANCE LOGS (ADMIN ONLY) */}
        {activeTab === 'audit-logs' && (user.is_admin || user.role === 'admin') && (
          <AuditLogsView user={user} />
        )}

        {/* VIEW 9: TEAM MEMBER PROVISIONING (ADMIN ONLY) */}
        {activeTab === 'team' && (user.is_admin || user.role === 'admin') && (
          <TeamView user={user} />
        )}

        {/* VIEW 10: SYSTEM & ACCOUNT SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView user={user} onLogout={handleLogout} />
        )}

      </main>

      {/* Citation Inspector Modal */}
      <CitationModal
        citationData={inspectingCitation}
        onClose={() => setInspectingCitation(null)}
      />

      {/* Share Filing Modal */}
      {shareDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neo-card bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 space-y-4 text-black relative font-mono">
            <button
              onClick={() => {
                setShareDocId(null);
                setShareEmail('');
                setShareWithEntireOrg(false);
              }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            <div className="space-y-1">
              <span className="neo-badge bg-[#FFE600] text-black">SHARE SEC FILING</span>
              <h3 className="text-lg font-black text-black flex items-center gap-2 mt-1 uppercase">
                <Share2 className="w-5 h-5 text-black stroke-[2.5]" />
                <span>GRANT ACCESS PERMISSIONS</span>
              </h3>
              <p className="text-xs text-zinc-600 font-bold">
                Share this audit-verified filing across your organization.
              </p>
            </div>

            <form onSubmit={handleShareSubmit} className="space-y-4">
              <div className="space-y-2 pt-1">
                <label className="flex items-start space-x-3 p-3 border-2 border-black bg-zinc-50 cursor-pointer hover:bg-yellow-50">
                  <input
                    type="radio"
                    name="shareScope"
                    checked={!shareWithEntireOrg}
                    onChange={() => setShareWithEntireOrg(false)}
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <div className="text-xs font-black text-black uppercase">Specific Teammate</div>
                    <div className="text-[11px] text-zinc-600 font-bold">Grant access to a specific corporate email address</div>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 border-2 border-black bg-zinc-50 cursor-pointer hover:bg-yellow-50">
                  <input
                    type="radio"
                    name="shareScope"
                    checked={shareWithEntireOrg}
                    onChange={() => setShareWithEntireOrg(true)}
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <div className="text-xs font-black text-black uppercase flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Entire Organization</span>
                    </div>
                    <div className="text-[11px] text-zinc-600 font-bold">Grant Viewer access to all members in your company</div>
                  </div>
                </label>
              </div>

              {!shareWithEntireOrg && (
                <div>
                  <label className="text-xs font-black text-black block mb-1 uppercase">TEAMMATE EMAIL</label>
                  <input
                    type="email"
                    required={!shareWithEntireOrg}
                    placeholder="colleague@finance.corp"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="neo-input"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShareDocId(null);
                    setShareEmail('');
                    setShareWithEntireOrg(false);
                  }}
                  className="neo-button-secondary text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="neo-button-primary text-xs"
                >
                  <span>{shareWithEntireOrg ? 'SHARE WITH ENTIRE ORG' : 'GRANT ACCESS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal triggered from Landing or Navbar */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        selectedPlan={pendingPlan}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingPlan(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* SaaS Customer Onboarding Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        user={user}
        onClose={() => setShowPlanModal(false)}
        onBackToLanding={() => {
          setShowPlanModal(false);
          handleLogout();
        }}
        onPlanSelected={async (sub) => {
          setShowPlanModal(false);
          await fetchCredits();
          const u = await api.getCurrentUser().catch(() => user);
          setUser(u);
          await loadDocuments();
          setActiveTab('dashboard');
        }}
      />

      {/* SaaS Usage / Limit Upgrade Modal */}
      <UpgradeModal
        isOpen={!!upgradeModalState}
        onClose={() => setUpgradeModalState(null)}
        reason={upgradeModalState?.reason}
        message={upgradeModalState?.message}
        currentUsage={upgradeModalState?.currentUsage}
        limitValue={upgradeModalState?.limitValue}
        planName={upgradeModalState?.planName}
        onUpgrade={() => {
          setUpgradeModalState(null);
          setActiveTab('pricing');
        }}
      />

    </div>
  );
}
