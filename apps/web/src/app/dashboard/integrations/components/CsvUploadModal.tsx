'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, XCircle, CloudUpload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function CsvUploadModal({ isOpen, onClose, onSuccess }: CsvUploadModalProps) {
  const toast = useToast();
  const [csvModalTab, setCsvModalTab] = useState<'upload' | 'history'>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[] | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);

  const resetModalState = () => {
    setUploadFile(null);
    setUploadWarnings(null);
    setUploadSuccess(null);
    setUploadError(null);
  };

  const handleFileValidation = (file: File) => {
    setUploadError(null);
    setUploadWarnings(null);
    setUploadSuccess(null);

    if (!file.name.endsWith('.csv')) {
      setUploadError('Only CSV files are allowed');
      setUploadFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('CSV file size exceeds 5MB limit');
      setUploadFile(null);
      return;
    }

    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0] || '';
      const headers = firstLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

      const required = ['customer_id', 'event_type', 'occurred_at'];
      const missing = required.filter((h) => !headers.includes(h));

      if (missing.length > 0) {
        setUploadWarnings([
          `Missing recommended standard columns: ${missing.join(', ')}. Ingestion might fail or map improperly if fields are missing.`,
        ]);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', uploadFile);

      let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/api';
      }

      const response = await fetch(`${baseUrl}/integrations/csv/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      setUploadSuccess(result);
      toast.success('CSV queued successfully!');
      await onSuccess();
    } catch (err: any) {
      console.error('CSV upload failed:', err);
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!uploading) {
            onClose();
            resetModalState();
          }
        }}
        className="fixed inset-0 bg-black/70 z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 max-w-[90vw] bg-[#070B16] border border-[#152347] shadow-2xl z-50 p-6 sm:p-8 rounded-xl flex flex-col justify-between backdrop-blur-md text-slate-100"
      >
        <div>
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#152347]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base">Upload Custom Usage Events</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none">
                  Manual Event Ingestion
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!uploading) {
                  onClose();
                  resetModalState();
                }
              }}
              className="p-1.5 hover:bg-[#152347]/45 border border-transparent hover:border-[#152347] rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex border-b border-slate-800/80 mb-4 text-xs font-bold">
            <button
              onClick={() => setCsvModalTab('upload')}
              className={`pb-2.5 px-4 relative transition-colors cursor-pointer ${
                csvModalTab === 'upload' ? 'text-[#00D4FF]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload CSV
              {csvModalTab === 'upload' && (
                <motion.div
                  layoutId="activeCsvTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4FF]"
                />
              )}
            </button>
            <button
              onClick={() => setCsvModalTab('history')}
              className={`pb-2.5 px-4 relative transition-colors cursor-pointer ${
                csvModalTab === 'history' ? 'text-[#00D4FF]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sync History & Logs
              {csvModalTab === 'history' && (
                <motion.div
                  layoutId="activeCsvTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4FF]"
                />
              )}
            </button>
          </div>

          {csvModalTab === 'upload' ? (
            !uploadSuccess ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Upload a CSV containing customer event stream records. The system will validate
                  and queue the rows for background rescoring.
                </p>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileValidation(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    dragActive
                      ? 'border-cyan-400 bg-cyan-500/5'
                      : 'border-slate-800 bg-[#0C1224]/50 hover:border-slate-700 hover:bg-[#0C1224]/80'
                  }`}
                  onClick={() => document.getElementById('csv-file-input')?.click()}
                >
                  <input
                    type="file"
                    id="csv-file-input"
                    className="hidden"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileValidation(e.target.files[0]);
                      }
                    }}
                  />
                  <CloudUpload className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-xs text-slate-300 font-semibold">
                    {uploadFile ? uploadFile.name : 'Click to select or drag & drop CSV'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-bold">
                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : 'Maximum size 5MB'}
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs font-semibold rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{uploadError}</div>
                  </div>
                )}

                {uploadWarnings &&
                  uploadWarnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold rounded-lg flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{warning}</div>
                    </div>
                  ))}

                <div className="border-t border-[#152347] pt-4 mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      resetModalState();
                    }}
                    disabled={uploading}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={uploading || !uploadFile}
                    className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
                  >
                    {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    {uploading ? 'Processing File...' : 'Upload & Ingest'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-extrabold text-white text-base">Ingestion Queued</h5>
                  <p className="text-xs text-slate-400 mt-1">
                    We have successfully parsed {uploadSuccess.rowsQueued} event rows and registered
                    them in our data processing queues.
                  </p>
                </div>
                <div className="bg-[#0C1224] border border-slate-800 rounded-lg p-3 text-left space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Job ID:</span>
                    <span className="text-slate-300 font-mono select-all">
                      {uploadSuccess.jobId}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Status:</span>
                    <span className="text-emerald-400 capitalize">{uploadSuccess.status}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Rows Count:</span>
                    <span className="text-white">{uploadSuccess.rowsQueued} lines</span>
                  </div>
                </div>
                <div className="border-t border-[#152347] pt-4 mt-6">
                  <button
                    onClick={() => {
                      onClose();
                      resetModalState();
                    }}
                    className="btn-primary w-full"
                  >
                    Close & Return to Dashboard
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Recent asynchronous batch upload executions and event sync states.
              </p>
              <div className="bg-[#0C1224] border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 font-medium">
                No recent manual CSV executions found in this workspace session.
              </div>
              <div className="border-t border-[#152347] pt-4 mt-6 flex justify-end">
                <button
                  onClick={() => {
                    onClose();
                    resetModalState();
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
