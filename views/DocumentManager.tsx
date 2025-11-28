import React, { useMemo, useRef, useState } from 'react';
import { Agreement, AgreementDocument, AgreementStatus, RiskLevel } from '../types';
import {
  Search,
  Filter,
  MoreVertical,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Folder,
  UploadCloud,
  Paperclip,
  Trash2,
  Loader2,
  X,
} from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteAgreementDocument,
  listAgreementDocuments,
  uploadAgreementDocument,
} from '../services/agreementDocumentService';

interface ManagerProps {
  agreements: Agreement[];
  onOpenAgreement: (agreement: Agreement) => void;
  onStatusChange?: (agreementId: string, status: AgreementStatus) => Promise<void>;
}

const DocumentManager: React.FC<ManagerProps> = ({
  agreements,
  onOpenAgreement,
  onStatusChange,
}) => {
  const { isOrgAdmin, memberRole } = useAuth();
  const canAdminister = isOrgAdmin || memberRole === 'branch_admin';
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [manageAgreement, setManageAgreement] = useState<Agreement | null>(null);
  const [documents, setDocuments] = useState<AgreementDocument[]>([]);
  const [docError, setDocError] = useState<string | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredAgreements = useMemo(() => {
    return agreements.filter((agreement) => {
      const matchesStatus = filter === 'All' || agreement.status === filter;
      const matchesSearch =
        agreement.title.toLowerCase().includes(search.toLowerCase()) ||
        agreement.counterparty.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [agreements, filter, search]);

  const statusOptions = useMemo(
    () => Object.values(AgreementStatus),
    []
  );

  const getStatusStyles = (status: AgreementStatus) => {
    switch (status) {
      case AgreementStatus.APPROVED: return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
      case AgreementStatus.ACTIVE: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]';
      case AgreementStatus.REVIEW: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      case AgreementStatus.DRAFT: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const refreshDocuments = async (agreementId: string) => {
    setDocsLoading(true);
    setDocError(null);
    try {
      const items = await listAgreementDocuments(agreementId);
      setDocuments(items);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load documents.';
      setDocError(message);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleManageClick = (agreement: Agreement, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setManageAgreement(agreement);
    refreshDocuments(agreement.id);
  };

  const closeManagePanel = () => {
    setManageAgreement(null);
    setDocuments([]);
    setDocError(null);
    setStatusMessage(null);
  };

  const handleStatusUpdate = async (nextStatus: AgreementStatus) => {
    if (!manageAgreement || !onStatusChange) return;
    if (manageAgreement.status === nextStatus) return;
    setStatusSaving(true);
    setStatusMessage(null);
    try {
      await onStatusChange(manageAgreement.id, nextStatus);
      setManageAgreement((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      setStatusMessage('Status updated.');
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Failed to update status.'
      );
    } finally {
      setStatusSaving(false);
    }
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!manageAgreement) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setDocError(null);
    try {
      const uploads: AgreementDocument[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await uploadAgreementDocument({
          agreementId: manageAgreement.id,
          file,
        });
        uploads.push(uploaded);
      }
      setDocuments((prev) => [...uploads, ...prev]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed.';
      setDocError(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: AgreementDocument) => {
    if (!manageAgreement) return;
    setDocError(null);
    try {
      await deleteAgreementDocument(manageAgreement.id, doc.name);
      setDocuments((prev) => prev.filter((item) => item.path !== doc.path));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete document.';
      setDocError(message);
    }
  };

  const getFileSizeLabel = (size: number) => {
    if (!size) return 'Unknown size';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDisplayName = (doc: AgreementDocument) =>
    doc.originalName || doc.name.replace(/^\d+-/, '');

  return (
    <div className="p-10 h-full flex flex-col">
      <div className="flex justify-between items-end mb-10">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 font-['Outfit']">Document Manager</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Centralized repository for organizational agreements.</p>
        </div>
        <div className="flex gap-4">
            <button className="px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center gap-2">
                <Folder size={16} className="text-brand" /> Collections
            </button>
            <button className="bg-brand hover:bg-brand/90 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-brand/20 text-sm font-bold transition-all transform hover:-translate-y-0.5">
                Export Report
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-1.5 rounded-xl mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 p-1">
            <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by title, counterparty, or owner..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-[#0f172a]/50 border border-transparent rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:bg-white dark:focus:bg-[#0f172a] focus:border-brand/50 focus:ring-0 outline-none transition-all"
                />
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-white/10 mx-4"></div>
            <div className="flex gap-1">
                {['All', AgreementStatus.ACTIVE, AgreementStatus.REVIEW, AgreementStatus.DRAFT].map(status => (
                    <button 
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            filter === status 
                            ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>
        <button className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <Filter size={20} />
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-[#0f172a]/40 rounded-2xl shadow-sm dark:shadow-2xl flex-1 overflow-hidden flex flex-col backdrop-blur-sm">
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                        <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Agreement Details</th>
                        <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Risk Profile</th>
                        <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Effective Date</th>
                        <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department</th>
                        <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {filteredAgreements.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-20">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                        <Search size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No agreements found matching your filters.</p>
                                </div>
                            </td>
                        </tr>
                    ) : filteredAgreements.map((agreement) => (
                        <tr 
                            key={agreement.id} 
                            onClick={() => onOpenAgreement(agreement)}
                            className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                        >
                            <td className="px-8 py-5">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 bg-slate-100 dark:bg-[#1e293b] text-brand rounded-lg border border-slate-200 dark:border-white/5 group-hover:border-brand/30 transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-200 text-sm mb-1 group-hover:text-brand transition-colors">{agreement.title}</p>
                                        <p className="text-xs text-slate-500">{agreement.counterparty}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyles(agreement.status)}`}>
                                    {agreement.status}
                                </span>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2.5">
                                    {agreement.riskLevel === RiskLevel.HIGH && <AlertTriangle size={16} className="text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]" />}
                                    {agreement.riskLevel === RiskLevel.MEDIUM && <AlertTriangle size={16} className="text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />}
                                    {agreement.riskLevel === RiskLevel.LOW && <CheckCircle2 size={16} className="text-emerald-500 drop-shadow-[0_0_3px_rgba(16,185,129,0.5)]" />}
                                    <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{agreement.riskLevel}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                    <Calendar size={14} className="text-slate-400 dark:text-slate-600" />
                                    {new Date(agreement.effectiveDate).toLocaleDateString()}
                                </div>
                            </td>
                             <td className="px-6 py-5">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded border border-slate-200 dark:border-white/5">{agreement.department}</span>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canAdminister && (
                                    <button
                                      onClick={(event) => handleManageClick(agreement, event)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand transition-colors"
                                    >
                                      Manage
                                    </button>
                                  )}
                                  <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                      <MoreVertical size={18} />
                                  </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        {/* Pagination Mock */}
        <div className="px-8 py-5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-[#0f172a]">
            <p className="text-xs text-slate-500">Showing <span className="text-slate-900 dark:text-white font-bold">{filteredAgreements.length}</span> entries</p>
            <div className="flex gap-2">
                <button className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30"><ArrowLeft size={14} /></button>
                <button className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"><ArrowRight size={14} /></button>
            </div>
        </div>
      </div>
      {canAdminister && manageAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white dark:bg-[#020617] w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 relative p-8">
            <button
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition"
              onClick={closeManagePanel}
            >
              <X size={16} />
            </button>
            <div className="space-y-1 mb-6">
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">
                Admin Controls
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {manageAgreement.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Counterparty: {manageAgreement.counterparty}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">
                      Status
                    </p>
                    <p className="text-sm text-slate-500">
                      Align status across workflow stages
                    </p>
                  </div>
                  <select
                    value={manageAgreement.status}
                    onChange={(e) =>
                      handleStatusUpdate(e.target.value as AgreementStatus)
                    }
                    disabled={statusSaving}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] text-sm font-semibold text-slate-700 dark:text-white focus:border-brand focus:ring-0"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                {statusMessage && (
                  <p className="text-xs text-slate-500 mt-2">{statusMessage}</p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">
                      Supporting Documents
                    </p>
                    <p className="text-sm text-slate-500">
                      Upload PDFs, scans, or exhibits tied to this agreement.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleUploadFiles}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Uploading
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} /> Upload Files
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {docError && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-2 mb-3">
                    {docError}
                  </div>
                )}
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                      <Loader2 size={20} className="animate-spin mr-2" /> Loading
                      documents...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.path}
                        className="flex items-center justify-between border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 bg-white dark:bg-[#0f172a]"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip size={16} className="text-brand" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {getDisplayName(doc)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {getFileSizeLabel(doc.size)}
                              {doc.mimeType ? ` • ${doc.mimeType}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand hover:underline"
                          >
                            Download
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;