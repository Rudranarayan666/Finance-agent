import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Upload, 
  Trash2, 
  Share2, 
  Play, 
  MessageSquare, 
  BarChart3, 
  ShieldCheck, 
  Clock, 
  Building2,
  CheckCircle2,
  FileCode,
  Lock,
  ExternalLink
} from 'lucide-react';
import UploadZone from './UploadZone';
import { api } from '../services/api';

export default function DocumentsView({ 
  user, 
  documents, 
  activeDocument, 
  selectDocument, 
  onNavigate, 
  onDocumentUploaded, 
  onDeleteDocument, 
  onOpenShareModal, 
  onTriggerAnalysis, 
  isProcessing, 
  currentJob 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadZone, setShowUploadZone] = useState(false);

  const isViewer = user && user.role === 'viewer';
  const isAdmin = user && user.role === 'admin';

  const filteredDocs = documents.filter(doc => {
    const q = searchTerm.toLowerCase();
    return (
      (doc.company_name || '').toLowerCase().includes(q) ||
      (doc.filename || '').toLowerCase().includes(q) ||
      (doc.fiscal_period || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 font-mono text-zinc-900">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-black flex items-center gap-2">
            <FileText className="w-5 h-5 stroke-[2.5]" />
            <span>FINANCIAL DOCUMENT REPOSITORY</span>
          </h1>
          <p className="text-[11px] text-zinc-600 font-sans">
            Cryptographically Sealed SEC 10-K &amp; 10-Q Filings &bull; Scoped to {user?.organization_name || 'FinanceCorp Global'}
          </p>
        </div>

        {!isViewer && (
          <button
            onClick={() => setShowUploadZone(!showUploadZone)}
            className="neo-button-primary text-xs self-start sm:self-auto"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{showUploadZone ? 'HIDE UPLOAD' : '+ UPLOAD DOCUMENT'}</span>
          </button>
        )}
      </div>

      {/* Upload Zone Drawer */}
      {showUploadZone && !isViewer && (
        <div className="neo-card bg-[#FFF9C4] space-y-2">
          <div className="flex items-center justify-between">
            <span className="neo-badge-yellow text-[9px]">INLINE DOCUMENT INGESTION</span>
            <span className="text-[10px] font-black text-black uppercase">CLEARANCE: {user?.role}</span>
          </div>
          <UploadZone 
            onDocumentUploaded={(doc) => {
              onDocumentUploaded(doc);
              setShowUploadZone(false);
            }}
            isProcessing={isProcessing}
            currentJob={currentJob}
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="SEARCH BY COMPANY NAME, FILING TYPE, OR FISCAL PERIOD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neo-input pl-9 text-xs"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="neo-table-header text-[10px]">COMPANY / FILING</th>
              <th className="neo-table-header text-[10px]">FISCAL PERIOD</th>
              <th className="neo-table-header text-[10px]">PAGE COUNT</th>
              <th className="neo-table-header text-[10px]">STATUS</th>
              <th className="neo-table-header text-[10px] text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const isSelected = activeDocument?.id === doc.id;
                const pdfUrl = api.getDocumentPdfUrl(doc.id);
                return (
                  <tr 
                    key={doc.id}
                    className={`hover:bg-yellow-50/50 transition cursor-pointer ${isSelected ? 'bg-[#FFF9C4]/40' : ''}`}
                    onClick={() => {
                      selectDocument(doc.id);
                      onNavigate('analysis');
                    }}
                  >
                    <td className="neo-table-cell font-bold text-black text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-black shrink-0" />
                        <div>
                          <div className="truncate max-w-[200px] font-black text-black text-xs sm:text-sm">{doc.company_name || doc.filename}</div>
                          <div className="text-xs text-zinc-800 font-sans font-medium truncate max-w-[180px]">{doc.filename}</div>
                        </div>
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

                    <td className="neo-table-cell text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            selectDocument(doc.id);
                            onNavigate('analysis');
                          }}
                          className="neo-button-secondary text-xs py-1 px-2.5 font-black"
                          title="Open Analysis"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>ANALYZE</span>
                        </button>

                        <button
                          onClick={() => window.open(pdfUrl, '_blank')}
                          className="neo-button-secondary text-xs py-1 px-2.5 font-black"
                          title="Open Raw PDF in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        {!isViewer && (
                          <button
                            onClick={() => onOpenShareModal(doc.id)}
                            className="neo-button-secondary text-xs py-1 px-2.5"
                            title="Share Filing"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(isAdmin || doc.uploaded_by === user?.email) && (
                          <button
                            onClick={(e) => onDeleteDocument(doc.id, e)}
                            className="neo-button-danger text-xs py-1 px-2.5"
                            title="Delete Filing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="neo-table-cell text-center py-8 text-zinc-800 font-sans font-medium text-xs sm:text-sm">
                  No documents found matching "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
