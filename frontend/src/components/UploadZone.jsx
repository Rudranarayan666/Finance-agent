import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function UploadZone({ onDocumentUploaded, isProcessing, currentJob }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndUpload = async (file) => {
    setError(null);

    // 1. File Type Validation (PDF, Excel, CSV)
    const validExtensions = ['.pdf', '.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      setError('INVALID FILE TYPE: Please upload a valid financial document (PDF, Excel .xlsx/.xls, or CSV).');
      return;
    }

    // 2. File Size Validation (50MB)
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`FILE TOO LARGE: Max allowed size is 50MB (Selected: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    try {
      setIsUploading(true);
      const doc = await api.uploadDocument(file);
      setIsUploading(false);
      if (onDocumentUploaded) {
        onDocumentUploaded(doc);
      }
    } catch (err) {
      setIsUploading(false);
      setError(err.message || 'Failed to upload document. Ensure you have Analyst or Admin permissions.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && !isProcessing && fileInputRef.current?.click()}
        className={`border-3 border-black p-5 sm:p-7 text-center transition-all cursor-pointer relative ${
          isDragging
            ? 'bg-[#FEF08A] shadow-[5px_5px_0px_0px_#000]'
            : 'bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#FFE600] hover:-translate-x-0.5 hover:-translate-y-0.5'
        } ${isProcessing || isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading || isProcessing ? (
          <div className="py-3 space-y-3 font-mono">
            <div className="w-10 h-10 mx-auto bg-[#FFE600] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
              <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-black tracking-wider">
                {isUploading ? 'VERIFYING & INGESTING DOCUMENT...' : 'EXECUTING MULTI-AGENT EXTRACTION GRAPH...'}
              </h3>
              <p className="text-[11px] text-zinc-600 font-sans mt-0.5">
                {currentJob?.step || 'Parsing table layout, extracting sheets & computing verification seals...'}
              </p>
            </div>

            {/* Neo-Brutalist Progress Bar */}
            <div className="w-full max-w-sm mx-auto bg-zinc-200 border-2 border-black h-3.5 p-0.5 shadow-[1px_1px_0px_0px_#000]">
              <div className="bg-[#FFE600] h-full animate-pulse border border-black" style={{ width: '85%' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1 font-mono">
            <div className="w-11 h-11 mx-auto bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
              <UploadCloud className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-black uppercase tracking-wider">
                DROP FINANCIAL DOCUMENT HERE OR CLICK TO BROWSE
              </h3>
              <p className="text-xs text-zinc-600 font-sans">
                Supports PDF (.pdf), Excel (.xlsx, .xls), and CSV (.csv) filings up to 50MB
              </p>
            </div>

            <div className="inline-flex items-center gap-2 pt-1 flex-wrap justify-center">
              <span className="neo-badge text-[9px] bg-[#FFE600] text-black font-black">
                PDF &bull; EXCEL &bull; CSV
              </span>
              <span className="neo-badge text-[9px] bg-zinc-100">
                <ShieldCheck className="w-3 h-3 text-black stroke-[2.5]" />
                SHA-256 SEALED
              </span>
              <span className="neo-badge text-[9px] bg-zinc-100">
                <Sparkles className="w-3 h-3 text-black stroke-[2.5]" />
                ANTI-MALWARE VALIDATED
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error alert with plan upgrade prompt */}
      {error && (
        <div className="mt-2.5 p-3 bg-[#FEE2E2] border-2 border-black text-rose-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span className="font-sans font-bold text-[11px]">{error}</span>
          </div>
          {(error.includes('limit') || error.includes('credit') || error.includes('402') || error.includes('403')) && (
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = 'pricing';
                window.dispatchEvent(new CustomEvent('open-pricing'));
              }}
              className="neo-badge bg-[#FFE600] text-black text-[10px] font-black shrink-0 cursor-pointer hover:bg-yellow-400"
            >
              UPGRADE PLAN &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
