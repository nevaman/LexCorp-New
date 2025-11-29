import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  Plus,
  Trash2,
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
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);

  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      if (table && editorRef.current?.contains(table)) {
        setHoveredTable(table);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('table')) {
        setHoveredTable(null);
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('mouseover', handleMouseOver);
      editor.addEventListener('mouseout', handleMouseOut);
      return () => {
        editor.removeEventListener('mouseover', handleMouseOver);
        editor.removeEventListener('mouseout', handleMouseOut);
      };
    }
  }, []);

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
    let tableHTML = '<table class="editor-table" style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #cbd5e1; position: relative;">';

    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        const cellStyle = 'border: 1px solid #cbd5e1; padding: 8px; min-width: 80px; ' + (i === 0 ? 'background: #f1f5f9; font-weight: 600;' : '');
        tableHTML += `<td style="${cellStyle}" contenteditable="true">${i === 0 ? `Header ${j + 1}` : 'Cell'}</td>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</table><p><br></p>';

    document.execCommand('insertHTML', false, tableHTML);
    handleInput();
  };

  const addTableRow = (table: HTMLTableElement) => {
    const newRow = table.insertRow();
    const colCount = table.rows[0]?.cells.length || 3;
    for (let i = 0; i < colCount; i++) {
      const cell = newRow.insertCell();
      cell.setAttribute('contenteditable', 'true');
      cell.style.border = '1px solid #cbd5e1';
      cell.style.padding = '8px';
      cell.style.minWidth = '80px';
      cell.textContent = 'Cell';
    }
    handleInput();
  };

  const addTableColumn = (table: HTMLTableElement) => {
    for (let i = 0; i < table.rows.length; i++) {
      const cell = table.rows[i].insertCell();
      cell.setAttribute('contenteditable', 'true');
      cell.style.border = '1px solid #cbd5e1';
      cell.style.padding = '8px';
      cell.style.minWidth = '80px';
      if (i === 0) {
        cell.style.background = '#f1f5f9';
        cell.style.fontWeight = '600';
        cell.textContent = `Header ${table.rows[i].cells.length}`;
      } else {
        cell.textContent = 'Cell';
      }
    }
    handleInput();
  };

  const deleteTableRow = (table: HTMLTableElement) => {
    if (table.rows.length > 1) {
      table.deleteRow(table.rows.length - 1);
      handleInput();
    }
  };

  const deleteTableColumn = (table: HTMLTableElement) => {
    const colCount = table.rows[0]?.cells.length || 0;
    if (colCount > 1) {
      for (let i = 0; i < table.rows.length; i++) {
        table.rows[i].deleteCell(colCount - 1);
      }
      handleInput();
    }
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
      <div className="relative">
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
        {hoveredTable && !disabled && (
          <div
            className="absolute bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/20 rounded-lg shadow-lg p-2 flex gap-1 z-50"
            style={{
              top: hoveredTable.getBoundingClientRect().top - editorRef.current!.getBoundingClientRect().top - 40,
              left: hoveredTable.getBoundingClientRect().left - editorRef.current!.getBoundingClientRect().left,
            }}
            onMouseEnter={() => setHoveredTable(hoveredTable)}
            onMouseLeave={() => setHoveredTable(null)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addTableRow(hoveredTable);
              }}
              title="Add Row"
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-green-600"
            >
              <Plus size={14} />
              <span className="text-xs ml-1">Row</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addTableColumn(hoveredTable);
              }}
              title="Add Column"
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-green-600"
            >
              <Plus size={14} />
              <span className="text-xs ml-1">Col</span>
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-white/10 mx-1"></div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteTableRow(hoveredTable);
              }}
              title="Delete Row"
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-red-600"
            >
              <Trash2 size={14} />
              <span className="text-xs ml-1">Row</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteTableColumn(hoveredTable);
              }}
              title="Delete Column"
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-red-600"
            >
              <Trash2 size={14} />
              <span className="text-xs ml-1">Col</span>
            </button>
          </div>
        )}
      </div>
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
        .rich-text-editor-content ul {
          margin: 0.5em 0;
          padding-left: 2em;
          list-style-type: disc;
          list-style-position: outside;
        }
        .rich-text-editor-content ol {
          margin: 0.5em 0;
          padding-left: 2em;
          list-style-type: decimal;
          list-style-position: outside;
        }
        .rich-text-editor-content ul ul {
          list-style-type: circle;
        }
        .rich-text-editor-content ol ol {
          list-style-type: lower-alpha;
        }
        .rich-text-editor-content li {
          margin: 0.25em 0;
          line-height: 1.6;
          display: list-item;
        }
        .rich-text-editor-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          border: 1px solid #cbd5e1;
        }
        .rich-text-editor-content td,
        .rich-text-editor-content th {
          border: 1px solid #cbd5e1;
          padding: 8px;
          min-width: 80px;
        }
        .rich-text-editor-content tr:first-child td,
        .rich-text-editor-content tr:first-child th {
          background: #f1f5f9;
          font-weight: 600;
        }
        .dark .rich-text-editor-content table {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .dark .rich-text-editor-content td,
        .dark .rich-text-editor-content th {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .dark .rich-text-editor-content tr:first-child td,
        .dark .rich-text-editor-content tr:first-child th {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};
