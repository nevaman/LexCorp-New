import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Loader2,
  Sparkles,
  Eye,
  Edit3,
  Undo,
  Redo,
  Type,
  List,
  ListOrdered,
  Bold,
  Italic,
  Underline,
} from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';
import { Template } from '../types';
import { fetchTemplates, saveTemplate } from '../services/templateService';

type DraftSection = {
  id: string;
  title: string;
  required: boolean;
  content: string;
};

const COMMON_SECTIONS: DraftSection[] = [
  {
    id: 'confidentiality',
    title: 'Confidentiality',
    required: true,
    content:
      'Both parties agree to keep all proprietary information confidential and to use it solely for the purposes of this Agreement.',
  },
  {
    id: 'termination',
    title: 'Termination',
    required: true,
    content:
      'Either party may terminate this Agreement upon 30 days written notice in the event of a material breach not cured within 15 days.',
  },
  {
    id: 'indemnification',
    title: 'Indemnification',
    required: false,
    content:
      'Each party shall defend, indemnify, and hold the other harmless from third-party claims arising from its negligence or willful misconduct.',
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    required: true,
    content: 'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.',
  },
  {
    id: 'payment-terms',
    title: 'Payment Terms',
    required: true,
    content:
      'Invoices are due within thirty (30) days of receipt. Late payments accrue interest at 1.5% per month or the maximum rate permitted by law.',
  },
];

const TemplateBuilder: React.FC = () => {
  const { organization, branchOfficeId, memberRole, user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSection[]>([]);
  const [templateMeta, setTemplateMeta] = useState({
    name: '',
    description: '',
    visibility: 'organization' as 'organization' | 'branch',
  });
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [undoStack, setUndoStack] = useState<DraftSection[][]>([]);
  const [redoStack, setRedoStack] = useState<DraftSection[][]>([]);
  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const isOrgAdmin = memberRole === 'org_admin';
  const isBranchAdmin = memberRole === 'branch_admin';
  const canEdit = isOrgAdmin || isBranchAdmin;

  const loadTemplates = async () => {
    if (!organization) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTemplates({
        organizationId: organization.id,
        branchOfficeId: branchOfficeId ?? null,
      });
      setTemplates(data);
      if (data.length) {
        setActiveTemplateId(data[0].id);
        setTemplateMeta({
          name: data[0].name,
          description: data[0].description || '',
          visibility: data[0].visibility,
        });
        setDraft(data[0].sections as DraftSection[]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load templates.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [organization?.id, branchOfficeId]);

  useEffect(() => {
    if (!activeTemplateId) return;
    const tmpl = templates.find((t) => t.id === activeTemplateId);
    if (tmpl) {
      setTemplateMeta({
        name: tmpl.name,
        description: tmpl.description || '',
        visibility: tmpl.visibility,
      });
      setDraft(tmpl.sections as DraftSection[]);
    }
  }, [activeTemplateId, templates]);

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    setDraft((prev) => {
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.length - 1)
      ) {
        return prev;
      }
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleAddSection = () => {
    setDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: 'New Section',
        required: false,
        content: '',
      },
    ]);
  };

  const handleDuplicate = (section: DraftSection) => {
    setDraft((prev) => [
      ...prev,
      {
        ...section,
        id: crypto.randomUUID(),
        title: `${section.title} Copy`,
      },
    ]);
  };

  const handleAddCommonSection = (section: DraftSection) => {
    if (!canEdit) return;
    setDraft((prev) => [
      ...prev,
      {
        ...section,
        id: crypto.randomUUID(),
      },
    ]);
  };

  const saveToUndoStack = () => {
    setUndoStack((prev) => [...prev, draft]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [draft, ...prev]);
    setUndoStack((prev) => prev.slice(0, -1));
    setDraft(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setUndoStack((prev) => [...prev, draft]);
    setRedoStack((prev) => prev.slice(1));
    setDraft(next);
  };

  const updateClauseContent = (sectionId: string, content: string) => {
    setDraft((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, content } : section))
    );
  };

  const withActiveTextArea = (
    callback: (params: {
      textarea: HTMLTextAreaElement;
      value: string;
      selectionStart: number;
      selectionEnd: number;
      clauseId: string;
    }) =>
      | {
          text: string;
          selectionStart: number;
          selectionEnd: number;
        }
      | void
  ) => {
    const targetId = activeClauseId ?? draft[0]?.id;
    if (!targetId) return;
    const textarea = textAreaRefs.current[targetId];
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const result = callback({
      textarea,
      value,
      selectionStart,
      selectionEnd,
      clauseId: targetId,
    });
    if (!result) return;

    updateClauseContent(targetId, result.text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const wrapSelection = (wrapper: string) => {
    withActiveTextArea(({ value, selectionStart, selectionEnd }) => {
      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd);
      const after = value.slice(selectionEnd);
      const newText = `${before}${wrapper}${selected}${wrapper}${after}`;
      const offset = wrapper.length;
      return {
        text: newText,
        selectionStart: selectionStart + offset,
        selectionEnd: selectionEnd + offset,
      };
    });
  };

  const insertBullets = (bulletType: 'bulleted' | 'numbered') => {
    withActiveTextArea(({ value, selectionStart, selectionEnd }) => {
      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd) || '';
      const after = value.slice(selectionEnd);
      const lines = selected.split('\n');
      const formattedLines = lines.map((line, index) => {
        const content = line.trim().length ? line : 'Clause text';
        if (bulletType === 'bulleted') {
          return `• ${content}`;
        }
        return `${index + 1}. ${content}`;
      });
      const insertion = formattedLines.join('\n');
      const newText = `${before}${insertion}${after}`;
      const start = before.length;
      const end = start + insertion.length;
      return {
        text: newText,
        selectionStart: start,
        selectionEnd: end,
      };
    });
  };

  const insertHeading = (level: 2 | 3) => {
    withActiveTextArea(({ value, selectionStart, selectionEnd }) => {
      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd) || 'Heading';
      const after = value.slice(selectionEnd);
      const prefix = level === 2 ? '## ' : '### ';
      const newText = `${before}${prefix}${selected}${after}`;
      const start = before.length;
      const end = start + prefix.length + selected.length;
      return {
        text: newText,
        selectionStart: start,
        selectionEnd: end,
      };
    });
  };

  const handleToolbarAction = (
    action: 'bold' | 'italic' | 'underline' | 'bullet' | 'numbered' | 'h2' | 'h3'
  ) => {
    if (!canEdit || draft.length === 0) return;
    saveToUndoStack();
    switch (action) {
      case 'bold':
        wrapSelection('**');
        break;
      case 'italic':
        wrapSelection('*');
        break;
      case 'underline':
        wrapSelection('__');
        break;
      case 'bullet':
        insertBullets('bulleted');
        break;
      case 'numbered':
        insertBullets('numbered');
        break;
      case 'h2':
        insertHeading(2);
        break;
      case 'h3':
        insertHeading(3);
        break;
      default:
        break;
    }
  };

  const handleRemove = (sectionId: string) => {
    saveToUndoStack();
    setDraft((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-white">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-100">$1</h3>')
      .replace(/^• (.+)$/gm, '<li class="ml-6">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-6">$1</li>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^(?!<[h|l])/gm, '<p class="mb-3">');
  };

  const handleSave = async () => {
    if (!organization || !user) return;
    if (!templateMeta.name.trim()) {
      setError('Template name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const templateId = activeTemplateId ?? crypto.randomUUID();
      const effectiveVisibility = isOrgAdmin ? templateMeta.visibility : 'branch';
      const branchTarget =
        effectiveVisibility === 'branch' ? branchOfficeId ?? null : null;
      if (effectiveVisibility === 'branch' && !branchTarget) {
        setError('Branch templates require a branch office context.');
        setSaving(false);
        return;
      }
      const payload: Template = {
        id: templateId,
        organization_id: organization.id,
        branch_office_id: branchTarget,
        name: templateMeta.name.trim(),
        description: templateMeta.description.trim(),
        visibility: effectiveVisibility,
        sections: draft,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const saved = await saveTemplate(payload);
      setSuccess('Template saved.');
      if (!activeTemplateId) setActiveTemplateId(saved.id);
      loadTemplates();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save template.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto text-slate-900 dark:text-slate-200 space-y-6">
      <style>{`
        .clause-textarea {
          font-size: 16px;
          line-height: 1.7;
        }
        .clause-textarea::placeholder {
          opacity: 0.5;
        }
      `}</style>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-['Outfit']">
            Template Builder
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Architect standardized legal structures. Templates are shared across your organization.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              if (isBranchAdmin && !branchOfficeId) {
                setError('Branch templates require an assigned office.');
                return;
              }
              const newId = crypto.randomUUID();
              setTemplates((prev) => [
                {
                  id: newId,
                  organization_id: organization?.id || '',
                  branch_office_id: null,
                  name: 'New Template',
                  description: '',
                  visibility: isBranchAdmin ? 'branch' : 'organization',
                  sections: [],
                  created_by: user?.id || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                ...prev,
              ]);
              setActiveTemplateId(newId);
              setTemplateMeta({
                name: 'New Template',
                description: '',
                visibility: isBranchAdmin ? 'branch' : 'organization',
              });
              setDraft([]);
            }}
            className="px-4 py-2 rounded-xl bg-brand text-white font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> New Template
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm dark:shadow-lg p-6 h-fit space-y-4">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white mb-2">Template Library</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose an existing template to edit.
              </p>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {templates.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No templates yet. Create one to get started.
                </p>
              )}
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setActiveTemplateId(tmpl.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all flex justify-between items-center ${
                    tmpl.id === activeTemplateId
                      ? 'border-brand/50 bg-brand/10'
                      : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/10'
                  }`}
                >
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        tmpl.id === activeTemplateId
                          ? 'text-brand'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tmpl.name}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400 mt-1">
                      {tmpl.visibility === 'organization' ? 'Org-wide' : 'Branch'}
                    </p>
                  </div>
                  {tmpl.id === activeTemplateId && (
                    <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded font-bold uppercase">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em]">
                Common Clauses
              </p>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {COMMON_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleAddCommonSection(section)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/5 hover:border-brand/40 hover:bg-brand/5 text-left text-slate-600 dark:text-slate-300"
                    disabled={!canEdit}
                  >
                    <span>{section.title}</span>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-slate-400">
                      Add
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {activeTemplateId && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={templateMeta.name}
                  onChange={(e) => setTemplateMeta({ ...templateMeta, name: e.target.value })}
                  placeholder="Template title"
                  disabled={!canEdit}
                  className="text-2xl font-bold w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-brand focus:outline-none pb-2 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <textarea
                  value={templateMeta.description}
                  onChange={(e) => setTemplateMeta({ ...templateMeta, description: e.target.value })}
                  placeholder="Add a summary for this template..."
                  disabled={!canEdit}
                  rows={2}
                  className="w-full text-sm text-slate-600 dark:text-slate-400 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 focus:border-brand focus:outline-none leading-[1.6] placeholder:text-slate-400"
                />
                {isOrgAdmin && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Visibility:</span>
                    <select
                      value={templateMeta.visibility}
                      disabled={!canEdit || isBranchAdmin}
                      onChange={(e) =>
                        setTemplateMeta({
                          ...templateMeta,
                          visibility: e.target.value as 'organization' | 'branch',
                        })
                      }
                      className="border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 focus:border-brand focus:outline-none"
                    >
                      <option value="organization">Organization-wide</option>
                      <option value="branch">Branch-specific</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm dark:shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#071029] px-6 py-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={!canEdit || undoStack.length === 0}
                    title="Undo"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Undo size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={!canEdit || redoStack.length === 0}
                    title="Redo"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Redo size={16} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('bold')}
                    disabled={!canEdit}
                    title="Bold"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('italic')}
                    disabled={!canEdit}
                    title="Italic"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('underline')}
                    disabled={!canEdit}
                    title="Underline"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Underline size={16} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('h2')}
                    disabled={!canEdit}
                    title="Heading 2"
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm font-bold hover:bg-slate-50 disabled:opacity-40"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('h3')}
                    disabled={!canEdit}
                    title="Heading 3"
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
                  >
                    H3
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('bullet')}
                    disabled={!canEdit}
                    title="Bullet List"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarAction('numbered')}
                    disabled={!canEdit}
                    title="Numbered List"
                    className="p-2 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ListOrdered size={16} />
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1"></div>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    title={previewMode ? 'Edit Mode' : 'Preview Mode'}
                    className={`p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 flex items-center gap-2 ${
                      previewMode ? 'bg-brand text-white' : 'bg-white dark:bg-[#0f172a]'
                    }`}
                  >
                    {previewMode ? (
                      <>
                        <Edit3 size={16} />
                        <span className="text-xs font-medium">Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        <span className="text-xs font-medium">Preview</span>
                      </>
                    )}
                  </button>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddSection}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 text-sm font-semibold flex items-center gap-1"
                    >
                      <Plus size={14} /> Clause
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Saving
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Save
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="px-8 py-8 space-y-8 overflow-y-auto flex-1 bg-white dark:bg-[#020617]">
                <div className="max-w-3xl mx-auto">
                  {previewMode ? (
                    <div className="bg-white dark:bg-[#0a1628] border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg p-10 space-y-8">
                      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
                          {templateMeta.name || 'Untitled Template'}
                        </h1>
                        {templateMeta.description && (
                          <p className="text-base text-slate-600 dark:text-slate-400 leading-[1.6]">
                            {templateMeta.description}
                          </p>
                        )}
                      </div>
                      {draft.map((block, index) => (
                        <div key={block.id} className="space-y-3">
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {index + 1}. {block.title}
                            {block.required && (
                              <span className="ml-2 text-xs bg-brand/10 text-brand px-2 py-1 rounded font-normal">
                                Required
                              </span>
                            )}
                          </h2>
                          <div
                            className="text-base leading-[1.7] text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(block.content) }}
                          />
                        </div>
                      ))}
                      {draft.length === 0 && (
                        <p className="text-center text-slate-500 py-12">
                          No clauses to preview. Switch to edit mode to add content.
                        </p>
                      )}
                    </div>
                  ) : (
                    draft.map((block, index) => (
                      <div
                        key={block.id}
                        className="border border-slate-200 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mt-6 first:mt-0"
                      >
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
                          <input
                            type="text"
                            value={block.title}
                            onChange={(e) =>
                              setDraft((prev) =>
                                prev.map((s) =>
                                  s.id === block.id ? { ...s, title: e.target.value } : s
                                )
                              )
                            }
                            placeholder="Clause heading"
                            disabled={!canEdit}
                            className="text-lg font-bold bg-transparent border-none focus:ring-0 w-full text-slate-900 dark:text-white"
                          />
                          {canEdit && !previewMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveBlock(index, 'up')}
                                className="p-2 text-slate-400 hover:text-brand"
                                title="Move up"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                onClick={() => moveBlock(index, 'down')}
                                className="p-2 text-slate-400 hover:text-brand"
                                title="Move down"
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(block)}
                                className="p-2 text-slate-400 hover:text-blue-500"
                                title="Duplicate"
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                onClick={() => handleRemove(block.id)}
                                className="p-2 text-slate-400 hover:text-red-500"
                                title="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="px-6 py-5 space-y-4">
                          <textarea
                            ref={(el) => {
                              textAreaRefs.current[block.id] = el;
                            }}
                            value={block.content}
                            onChange={(e) => updateClauseContent(block.id, e.target.value)}
                            onFocus={() => setActiveClauseId(block.id)}
                            placeholder="Write legal language here..."
                            disabled={!canEdit}
                            className="w-full min-h-[160px] bg-transparent border-none focus:ring-0 text-base leading-[1.7] whitespace-pre-wrap text-slate-700 dark:text-slate-100 placeholder:text-slate-400"
                            style={{
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            }}
                          />
                          {canEdit && !previewMode && (
                            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                              <input
                                type="checkbox"
                                checked={block.required}
                                onChange={(e) =>
                                  setDraft((prev) =>
                                    prev.map((s) =>
                                      s.id === block.id ? { ...s, required: e.target.checked } : s
                                    )
                                  )
                                }
                              />
                              Required clause
                            </label>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {!previewMode && draft.length === 0 && (
                    <div className="text-center text-sm text-slate-500 py-12 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl mt-6">
                      No clauses yet. Use the clause library or toolbar to start building.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateBuilder;