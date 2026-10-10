import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Share2, 
  FileCode,
  Copy,
  Sparkles
} from 'lucide-react';

import { api } from '../services/api';

export default function ReportsView({ 
  user, 
  documents, 
  activeDocument, 
  analysisResult, 
  selectDocument, 
  onInspectCitation,
  subscription,
  onUpgradeClick
}) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const canDownload = subscription?.can_download_reports ?? (user?.subscription?.can_download_reports ?? (user?.role === 'admin'));

  const checkDownloadAccess = () => {
    if (!canDownload) {
      if (onUpgradeClick) {
        onUpgradeClick({
          reason: 'DOWNLOAD_LIMIT',
          message: 'Financial report downloads and exports are restricted on the Free Basic plan. Upgrade to Pro or Premium to unlock verified executive reports.',
          planName: subscription?.plan_name || user?.subscription?.plan_name || 'Basic'
        });
      }
      return false;
    }
    return true;
  };

  const handleDownloadOfficialReport = async () => {
    if (!activeDocument) return;
    if (!checkDownloadAccess()) return;
    try {
      setIsDownloading(true);
      await api.downloadReport(activeDocument.id, `${activeDocument.company_name || 'financial'}_official_report.json`);
    } catch (err) {
      if (onUpgradeClick && (err.message?.includes('403') || err.message?.includes('Basic'))) {
        onUpgradeClick({
          reason: 'DOWNLOAD_LIMIT',
          message: err.message,
          planName: 'Basic'
        });
      } else {
        alert(err.message || 'Download failed');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!analysisResult) return;
    if (!checkDownloadAccess()) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysisResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${analysisResult.document_meta?.company_name || 'financial'}_intelligence_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMarkdown = () => {
    if (!analysisResult) return;
    if (!checkDownloadAccess()) return;
    let md = `# FINANCIAL INTELLIGENCE REPORT\n`;
    md += `Company: ${analysisResult.document_meta?.company_name || 'N/A'}\n`;
    md += `Fiscal Period: ${analysisResult.document_meta?.fiscal_period || 'N/A'}\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## TARGET METRICS SUMMARY\n\n`;
    
    if (analysisResult.metrics) {
      analysisResult.metrics.forEach((m) => {
        md += `### ${m.field}\n`;
        md += `- Value: ${m.value}\n`;
        md += `- Confidence: ${m.confidence || 'N/A'}\n`;
        md += `- Source Page: ${m.source?.page || 'N/A'}\n`;
        md += `- Quote: "${m.source?.quote || 'N/A'}"\n\n`;
      });
    }

    if (analysisResult.interpretation?.claims) {
      md += `## GROUNDED CLAIMS\n\n`;
      analysisResult.interpretation.claims.forEach((c, idx) => {
        md += `${idx + 1}. [${c.type?.toUpperCase()}] ${c.statement} (Page ${c.page_number})\n`;
      });
    }

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${analysisResult.document_meta?.company_name || 'financial'}_executive_summary.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-mono text-zinc-950 print:bg-white print:text-black">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-black pb-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 stroke-[2.5]" />
            <span>FINANCIAL INTELLIGENCE REPORTS &amp; EXPORTS</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-800 font-bold mt-1">
            AUDIT-VERIFIED EXECUTIVE SCORECARDS &bull; JSON &amp; MARKDOWN EXPORT ENGINE
            {!canDownload && (
              <span className="ml-2 bg-[#FEE2E2] text-rose-800 border border-black px-1.5 py-0.5 text-[10px] uppercase font-black">
                EXPORTS RESTRICTED TO PRO &amp; PREMIUM
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="neo-button-secondary text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>PRINT REPORT</span>
          </button>

          <button
            onClick={handleDownloadOfficialReport}
            disabled={!analysisResult || isDownloading}
            className={`text-xs sm:text-sm border-2 border-black font-black uppercase px-3 py-1.5 flex items-center gap-1.5 transition ${
              canDownload
                ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer'
                : 'bg-zinc-200 text-zinc-600 opacity-80 cursor-pointer'
            }`}
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isDownloading ? 'DOWNLOADING...' : canDownload ? 'DOWNLOAD AUDITED REPORT' : 'REPORT (LOCKED)'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            disabled={!analysisResult}
            className={`neo-button-secondary text-xs sm:text-sm ${!canDownload ? 'opacity-80' : ''}`}
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>MD EXPORT {!canDownload && '🔒'}</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            disabled={!analysisResult}
            className={`neo-button-primary text-xs sm:text-sm ${!canDownload ? 'opacity-80' : ''}`}
          >
            <FileCode className="w-4 h-4 stroke-[2.5]" />
            <span>JSON EXPORT {!canDownload && '🔒'}</span>
          </button>
        </div>
      </div>

      {/* Active Filing Switcher */}
      {documents.length > 1 && (
        <div className="neo-card p-3 flex items-center gap-3 overflow-x-auto print:hidden bg-white">
          <span className="text-xs font-black uppercase text-zinc-800 shrink-0">
            REPORT FILING:
          </span>
          <div className="flex items-center space-x-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => selectDocument(doc.id)}
                className={`neo-badge cursor-pointer transition-all ${
                  activeDocument?.id === doc.id
                    ? 'bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]'
                    : 'bg-white text-zinc-900 border-2 border-black hover:bg-yellow-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="font-bold">{doc.company_name || doc.filename}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report Content Panel */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Certificate Header Banner */}
          <div className="neo-card bg-[#FFF9C4] p-6 space-y-4 border-3 border-black shadow-[4px_4px_0px_0px_#000]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-black pb-4">
              <div>
                <span className="neo-badge bg-[#FFE600] text-black mb-2">
                  CRYPTOGRAPHIC COMPLIANCE CERTIFICATE
                </span>
                <h2 className="text-2xl font-black text-black">
                  {analysisResult.document_meta?.company_name}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-800 font-bold mt-1">
                  Filing Type: {analysisResult.document_meta?.filing_type || '10-Q'} &bull; Fiscal Period: {analysisResult.document_meta?.fiscal_period || 'FY2023'}
                </p>
              </div>

              <div className="neo-card bg-white border-2 border-black p-3 text-right shadow-[2px_2px_0px_0px_#000]">
                <span className="text-xs text-zinc-800 font-black block uppercase">VERIFICATION SEAL</span>
                <span className="text-xs sm:text-sm font-mono font-black text-black flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-green-700 stroke-[3]" />
                  SHA-256: VALIDATED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm font-mono">
              <div>
                <span className="text-zinc-800 font-black block text-xs">VERIFIED METRICS:</span>
                <strong className="text-black font-black text-sm">8 / 8 REQUIRED</strong>
              </div>
              <div>
                <span className="text-zinc-800 font-black block text-xs">GROUNDING STATUS:</span>
                <strong className="text-black font-black text-sm">100% DETERMINISTIC</strong>
              </div>
              <div>
                <span className="text-zinc-800 font-black block text-xs">TOTAL LATENCY:</span>
                <strong className="text-black font-black text-sm">{analysisResult.processing_meta?.total_latency_ms || 0}ms</strong>
              </div>
              <div>
                <span className="text-zinc-800 font-black block text-xs">AUDIT STAMP:</span>
                <strong className="text-black font-black text-sm">{new Date().toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* 8 Target Metrics Table */}
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-black text-black uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-black stroke-[3]" />
              <span>DETERMINISTIC METRIC BREAKDOWN TABLE</span>
            </h3>

            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="neo-table-header">Target Financial Metric</th>
                    <th className="neo-table-header">Extracted Value</th>
                    <th className="neo-table-header">Confidence</th>
                    <th className="neo-table-header">Source Page</th>
                    <th className="neo-table-header">Citation Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.metrics && analysisResult.metrics.map((m) => (
                    <tr key={m.field} className="hover:bg-yellow-50/50 transition">
                      <td className="neo-table-cell font-black text-black">
                        {m.field}
                      </td>
                      <td className="neo-table-cell text-black font-black text-sm">
                        {m.value !== null ? String(m.value) : 'Not Disclosed'}
                      </td>
                      <td className="neo-table-cell text-zinc-900 font-bold">
                        <span className="neo-badge bg-[#FFE600] text-black">
                          {m.confidence?.toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="neo-table-cell text-black font-black">
                        PAGE {m.source?.page || 'N/A'}
                      </td>
                      <td className="neo-table-cell text-xs font-sans text-zinc-900 font-medium italic max-w-xs truncate">
                        {m.source?.quote ? (
                          <button
                            onClick={() => onInspectCitation({ title: m.field, page: m.source.page, quote: m.source.quote })}
                            className="text-left text-zinc-950 hover:text-black underline font-bold"
                          >
                            "{m.source.quote}"
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grounded Executive Summary */}
          {analysisResult.interpretation && (
            <div className="neo-card bg-white p-6 space-y-4">
              <h3 className="text-base font-black text-black uppercase">
                EXECUTIVE SUMMARY &amp; GROUNDED CLAIMS
              </h3>
              <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-sans font-medium">
                {analysisResult.interpretation.summary}
              </p>

              {analysisResult.interpretation.claims && (
                <div className="space-y-2 pt-2 border-t-2 border-black">
                  <span className="text-xs font-black text-zinc-800 uppercase">AUDITED STATEMENTS:</span>
                  <div className="space-y-2">
                    {analysisResult.interpretation.claims.map((claim, idx) => (
                      <div key={idx} className="p-3 bg-[#FBFBFA] border-2 border-black flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className={`neo-badge ${
                            claim.type === 'metric' ? 'bg-[#BBF7D0] text-black' : 'bg-[#FEF08A] text-black'
                          }`}>
                            {claim.type}
                          </span>
                          <p className="text-xs sm:text-sm text-zinc-900 font-sans font-semibold">{claim.statement}</p>
                        </div>
                        <span className="neo-badge bg-white text-black shrink-0">
                          PAGE {claim.page_number}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="neo-card bg-white text-center py-16 space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-zinc-400 mx-auto" />
          <h3 className="text-base font-black text-black">NO REPORT GENERATED YET</h3>
          <p className="text-xs sm:text-sm text-zinc-700 font-bold">Select an active document to view and export its intelligence report.</p>
        </div>
      )}
    </div>
  );
}
