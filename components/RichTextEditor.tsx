import React, { useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Indent,
  Outdent,
} from './ui/Icons';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  onFocus,
  disabled = false,
  placeholder = 'Start typing...',
  minHeight = '160px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  }, [onChange]);

  const execCommand = (command: string, value?: string) => {
    if (disabled) return;
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertTable = () => {
    if (disabled) return;
    const rows = 3;
    const cols = 3;
    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #cbd5e1;">';

    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        const cellStyle = 'border: 1px solid #cbd5e1; padding: 8px; ' + (i === 0 ? 'background: #f1f5f9; font-weight: 600;' : '');
        tableHTML += `<td style="${cellStyle}" contenteditable="true">${i === 0 ? `Header ${j + 1}` : 'Cell'}</td>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</table><p><br></p>';

    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  };

  const formatBlock = (tag: string) => {
    if (disabled) return;
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        execCommand('outdent');
      } else {
        execCommand('indent');
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      execCommand('bold');
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      execCommand('italic');
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
      e.preventDefault();
      execCommand('underline');
    }
  };

  return (
    <div className="rich-text-editor-container">
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#050c1f]">
        <button
          type="button"
          onClick={() => formatBlock('h2')}
          disabled={disabled}
          title="Heading 2"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Type size={16} className="font-bold" />
        </button>
        <button
          type="button"
          onClick={() => formatBlock('h3')}
          disabled={disabled}
          title="Heading 3"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 text-sm"
        >
          H3
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-white/10 my-1 mx-1"></div>
        <button
          type="button"
          onClick={() => execCommand('bold')}
          disabled={disabled}
          title="Bold (Ctrl+B)"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          disabled={disabled}
          title="Italic (Ctrl+I)"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          disabled={disabled}
          title="Underline (Ctrl+U)"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Underline size={16} />
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-white/10 my-1 mx-1"></div>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          disabled={disabled}
          title="Bullet List"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          disabled={disabled}
          title="Numbered List"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('indent')}
          disabled={disabled}
          title="Indent (Tab)"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Indent size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('outdent')}
          disabled={disabled}
          title="Outdent (Shift+Tab)"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Outdent size={16} />
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-white/10 my-1 mx-1"></div>
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          disabled={disabled}
          title="Align Left"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          disabled={disabled}
          title="Align Center"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          disabled={disabled}
          title="Align Right"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <AlignRight size={16} />
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-white/10 my-1 mx-1"></div>
        <button
          type="button"
          onClick={insertTable}
          disabled={disabled}
          title="Insert Table"
          className="p-2 rounded hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40"
        >
          <Table size={16} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        className="rich-text-editor-content p-4 outline-none"
        style={{
          minHeight,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        data-placeholder={placeholder}
      />
      <style>{`
        .rich-text-editor-content {
          font-size: 16px;
          line-height: 1.7;
          color: inherit;
        }
        .rich-text-editor-content:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
        }
        .rich-text-editor-content h2 {
          font-size: 1.5em;
          font-weight: 700;
          margin: 1em 0 0.5em 0;
          line-height: 1.2;
        }
        .rich-text-editor-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.8em 0 0.4em 0;
          line-height: 1.3;
        }
        .rich-text-editor-content p {
          margin: 0 0 0.75em 0;
        }
        .rich-text-editor-content ul,
        .rich-text-editor-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }
        .rich-text-editor-content li {
          margin: 0.25em 0;
          line-height: 1.6;
        }
        .rich-text-editor-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          border: 1px solid #cbd5e1;
        }
        .rich-text-editor-content td {
          border: 1px solid #cbd5e1;
          padding: 8px;
        }
        .rich-text-editor-content tr:first-child td {
          background: #f1f5f9;
          font-weight: 600;
        }
        .dark .rich-text-editor-content table {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .dark .rich-text-editor-content td {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .dark .rich-text-editor-content tr:first-child td {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};
