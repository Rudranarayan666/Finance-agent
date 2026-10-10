import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  Upload, 
  MessageSquare, 
  BarChart3, 
  ArrowRight, 
  Clock, 
  Lock,
  Sparkles,
  TrendingUp,
  Database
} from 'lucide-react';
import UploadZone from './UploadZone';

export default function DashboardView({ 
  user, 
  documents, 
  activeDocument, 
  selectDocument, 
  onNavigate, 
  onDocumentUploaded, 
  isProcessing, 
  currentJob 
}) {
  const completedDocs = documents.filter(d => d.status === 'completed');
  const totalPages = documents.reduce((acc, d) => acc + (d.total_pages || 0), 0);

  return (
    <div className="space-y-6 font-mono text-zinc-900">
      {/* Welcome Banner */}
      <div className="neo-card bg-[#FFF9C4] border-3 shadow-[4px_4px_0px_0px_#000] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="neo-badge-yellow text-[10px]">
              WORKSPACE ACTIVE
            </span>
            <span className="neo-badge text-[10px] bg-white text-black">
              {user?.organization_name || 'FinanceCorp Global'}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-black tracking-tight uppercase">
            WELCOME BACK, {user?.full_name?.toUpperCase() || 'ANALYST'}
          </h1>
          <p className="text-xs text-zinc-700 font-sans">
            Clearance Tier: <span className="neo-badge text-[9px] py-0 bg-white font-black">{user?.role?.toUpperCase()}</span> &bull; Deterministic 10-K &amp; 10-Q Financial Intelligence
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-stretch md:self-auto">
          {user?.role !== 'viewer' && (
            <button 
              onClick={() => onNavigate('documents')}
              className="neo-button-primary text-xs w-full md:w-auto justify-center"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>UPLOAD FILING</span>
            </button>
          )}
          <button 
            onClick={() => onNavigate('research')}
            className="neo-button-secondary text-xs w-full md:w-auto justify-center"
          >
            <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>AI CHATBOT</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="neo-card bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-800">TOTAL FILINGS</span>
            <div className="w-7 h-7 bg-[#FFE600] text-black border-2 border-black font-extrabold flex items-center justify-center">
              <FileText className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-black">{documents.length}</div>
            <div className="text-xs text-zinc-800 font-sans font-medium mt-0.5">
              {completedDocs.length} Verified &bull; {totalPages} Pages
            </div>
          </div>
        </div>

        <div className="neo-card bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-800">VERIFICATION ENGINE</span>
            <div className="w-7 h-7 bg-[#BBF7D0] text-black border-2 border-black font-extrabold flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-black">8 / 8 METRICS</div>
            <div className="text-xs text-zinc-800 font-sans font-medium mt-0.5">
              100% Substring Grounded
            </div>
          </div>
        </div>

        <div className="neo-card bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-800">DUCKDB VECTORIZED</span>
            <div className="w-7 h-7 bg-[#BAE6FD] text-black border-2 border-black font-extrabold flex items-center justify-center">
              <Database className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-black">&lt; 2MS SQL</div>
            <div className="text-xs text-zinc-800 font-sans font-medium mt-0.5">
              Zero Latency Analytics
            </div>
          </div>
        </div>

        <div className="neo-card bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-800">IMMUTABLE SEALS</span>
            <div className="w-7 h-7 bg-[#FEF08A] text-black border-2 border-black font-extrabold flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-black">SHA-256</div>
            <div className="text-xs text-zinc-800 font-sans font-medium mt-0.5">
              SHA-256 Hash Chain Receipts
            </div>
          </div>
        </div>
      </div>

      {/* Quick Upload Section for Analysts / Admins */}
      {user?.role !== 'viewer' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black text-black uppercase flex items-center gap-2">
              <Upload className="w-4 h-4 stroke-[3]" />
              <span>INGEST FINANCIAL REPORT (PDF / EXCEL / CSV)</span>
            </h2>
            <span className="neo-badge text-xs bg-zinc-100 text-black">
              ANTI-MALWARE SCAN ACTIVE
            </span>
          </div>
          <UploadZone 
            onDocumentUploaded={onDocumentUploaded}
            isProcessing={isProcessing}
            currentJob={currentJob}
          />
        </div>
      )}

      {/* Recent Filings Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black text-black uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 stroke-[2.5]" />
            <span>RECENT REPOSITORY FILINGS ({documents.length})</span>
          </h2>
          <button 
            onClick={() => onNavigate('documents')}
            className="text-xs font-black text-black hover:underline flex items-center gap-1 uppercase cursor-pointer"
          >
            <span>VIEW ALL</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="neo-table-header">COMPANY / FILING</th>
                <th className="neo-table-header">PERIOD</th>
                <th className="neo-table-header">PAGES</th>
                <th className="neo-table-header">STATUS</th>
                <th className="neo-table-header text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {documents.length > 0 ? (
                documents.slice(0, 5).map((doc) => (
                  <tr 
                    key={doc.id} 
                    onClick={() => {
                      selectDocument(doc.id);
                      onNavigate('analysis');
                    }}
                    className="hover:bg-yellow-50/50 cursor-pointer transition"
                  >
                    <td className="neo-table-cell font-bold text-black text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-black shrink-0" />
                        <span className="truncate max-w-[200px] font-black text-black">{doc.company_name || doc.filename}</span>
                      </div>
                    </td>
                    <td className="neo-table-cell text-black font-black text-xs sm:text-sm">
                      {doc.fiscal_period || 'FY26'}
                    </td>
                    <td className="neo-table-cell text-black font-black text-xs sm:text-sm">
                      {doc.total_pages} Pages
                    </td>
                    <td className="neo-table-cell">
                      <span className={`neo-badge text-xs py-0.5 ${
                        doc.status === 'completed'
                          ? 'bg-[#BBF7D0] text-black font-black'
                          : doc.status === 'processing'
                          ? 'bg-[#FEF08A] text-black font-black'
                          : 'bg-zinc-100 text-black font-bold'
                      }`}>
                        {doc.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="neo-table-cell text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          selectDocument(doc.id);
                          onNavigate('analysis');
                        }}
                        className="neo-button-secondary text-xs py-1 px-2.5 font-black"
                      >
                        INSPECT
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="neo-table-cell text-center py-8 text-zinc-800 font-sans font-medium text-xs sm:text-sm">
                    No documents uploaded yet. Upload a PDF, Excel, or CSV filing to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
