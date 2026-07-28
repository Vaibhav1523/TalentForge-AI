'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontSize from '@/lib/tiptap-font-size';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback, useId, useRef, useState } from 'react';
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Heading2, Heading3, Undo2, Redo2, Link2, Minus,
  Quote, Code, RemoveFormatting, Highlighter, Palette,
  CaseSensitive,
} from 'lucide-react';


const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px'];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  theme?: 'light' | 'dark';
}

type Colors = {
  btnColor: string;
  btnActiveBg: string;
  btnActiveColor: string;
  btnHoverBg: string;
};

// Preset text colours
const TEXT_COLORS = [
  { label: 'Default',  value: ''        },
  { label: 'Teal',     value: '#0d9488' },
  { label: 'Blue',     value: '#3b82f6' },
  { label: 'Purple',   value: '#8b5cf6' },
  { label: 'Red',      value: '#ef4444' },
  { label: 'Orange',   value: '#f97316' },
  { label: 'Green',    value: '#22c55e' },
  { label: 'Yellow',   value: '#eab308' },
  { label: 'Pink',     value: '#ec4899' },
];

// Preset highlight colours
const HIGHLIGHT_COLORS = [
  { label: 'None',     value: ''        },
  { label: 'Yellow',   value: '#fef08a' },
  { label: 'Green',    value: '#bbf7d0' },
  { label: 'Blue',     value: '#bfdbfe' },
  { label: 'Purple',   value: '#ddd6fe' },
  { label: 'Pink',     value: '#fbcfe8' },
  { label: 'Orange',   value: '#fed7aa' },
  { label: 'Teal',     value: '#99f6e4' },
];

function ToolbarButton({
  onClick, active, title, children, disabled, colors,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  colors: Colors;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '30px', borderRadius: '6px', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? colors.btnActiveBg : 'transparent',
        color: active ? colors.btnActiveColor : colors.btnColor,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLButtonElement).style.background = colors.btnHoverBg;
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function Sep({ color }: { color: string }) {
  return <span style={{ width: '1px', height: '20px', background: color, margin: '0 2px', flexShrink: 0 }} />;
}

function ColorPicker({
  icon, title, swatches, activeColor, onSelect, isDark, btnColors,
}: {
  icon: React.ReactNode;
  title: string;
  swatches: { label: string; value: string }[];
  activeColor: string;
  onSelect: (color: string) => void;
  isDark: boolean;
  btnColors: Colors;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const popupBg = isDark ? '#1e2534' : '#fff';
  const popupBorder = isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '2px',
          height: '30px', padding: '0 6px', borderRadius: '6px', border: 'none',
          cursor: 'pointer', background: 'transparent',
          color: activeColor || btnColors.btnColor,
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = btnColors.btnHoverBg; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        {icon}
        {/* Colour indicator bar */}
        <span style={{
          display: 'block', width: '14px', height: '3px', borderRadius: '2px',
          background: activeColor || (isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af'),
          marginTop: '1px',
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '34px', left: 0, zIndex: 9999,
          background: popupBg, border: `1px solid ${popupBorder}`,
          borderRadius: '10px', padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: '6px',
          minWidth: '152px',
        }}>
          {swatches.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              title={label}
              onMouseDown={(e) => { e.preventDefault(); onSelect(value); setOpen(false); }}
              style={{
                width: '24px', height: '24px', borderRadius: '5px', border: 'none',
                cursor: 'pointer', padding: 0,
                background: value || (isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'),
                boxShadow: value === activeColor ? '0 0 0 2px #0d9488' : '0 0 0 1px rgba(0,0,0,0.1)',
                position: 'relative',
              }}
            >
              {/* "None" cross */}
              {!value && (
                <span style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', color: isDark ? 'rgba(255,255,255,0.5)' : '#9ca3af',
                }}>✕</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FontSizePicker({
  activeSize, onSelect, isDark, btnColors,
}: {
  activeSize: string;
  onSelect: (size: string) => void;
  isDark: boolean;
  btnColors: Colors;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const popupBg     = isDark ? '#1e2534' : '#fff';
  const popupBorder = isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const itemHover   = isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6';
  const activeItem  = isDark ? 'rgba(13,148,136,0.3)' : '#e0e7ff';
  const activeText  = isDark ? '#2dd4bf' : '#3b82f6';
  const textColor   = isDark ? 'rgba(255,255,255,0.8)' : '#374151';

  const label = activeSize ? activeSize.replace('px', '') : 'Size';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        title="Font Size"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          height: '30px', padding: '0 7px', borderRadius: '6px', border: 'none',
          cursor: 'pointer', background: 'transparent',
          color: activeSize ? btnColors.btnActiveColor : btnColors.btnColor,
          fontSize: '12px', fontWeight: 600, flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = btnColors.btnHoverBg; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <CaseSensitive size={14} />
        <span>{label}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '34px', left: 0, zIndex: 9999,
          background: popupBg, border: `1px solid ${popupBorder}`,
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)', minWidth: '100px',
        }}>
          {/* Reset option */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(''); setOpen(false); }}
            style={{
              display: 'block', width: '100%', padding: '7px 14px', border: 'none',
              background: !activeSize ? activeItem : 'transparent',
              color: !activeSize ? activeText : textColor,
              fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={(e) => { if (activeSize) (e.currentTarget as HTMLButtonElement).style.background = itemHover; }}
            onMouseLeave={(e) => { if (activeSize) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            Default
          </button>
          {FONT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(size); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '7px 14px', border: 'none',
                background: activeSize === size ? activeItem : 'transparent',
                color: activeSize === size ? activeText : textColor,
                fontSize: size, fontWeight: activeSize === size ? 700 : 400,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (activeSize !== size) (e.currentTarget as HTMLButtonElement).style.background = itemHover; }}
              onMouseLeave={(e) => { if (activeSize !== size) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {size.replace('px', '')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value, onChange, placeholder, minHeight = 260, theme = 'light',
}: RichTextEditorProps) {
  const isDark = theme === 'dark';
  const uid = useId().replace(/:/g, '');

  const colors = {
    text:           isDark ? 'rgba(255,255,255,0.85)' : '#111827',
    placeholder:    isDark ? 'rgba(255,255,255,0.28)' : '#9ca3af',
    heading:        isDark ? '#ffffff'                : '#111827',
    link:           isDark ? '#2dd4bf'                : '#3b82f6',
    code:           isDark ? 'rgba(13,148,136,0.18)'  : '#f3f4f6',
    codeText:       isDark ? '#2dd4bf'                : '#1f2937',
    quote:          isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
    quoteBorder:    isDark ? '#0d9488'                : '#3b82f6',
    quoteText:      isDark ? 'rgba(255,255,255,0.65)' : '#4b5563',
    hr:             isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    border:         isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #d1d5db',
    bg:             isDark ? '#1a1f2e'                : '#ffffff',
    toolbarBg:      isDark ? '#131720'                : '#f9fafb',
    toolbarBdr:     isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
    divider:        isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
    btnColor:       isDark ? 'rgba(255,255,255,0.7)'  : '#374151',
    btnActiveBg:    isDark ? 'rgba(13,148,136,0.3)'   : '#e0e7ff',
    btnActiveColor: isDark ? '#2dd4bf'                : '#3b82f6',
    btnHoverBg:     isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6',
    wordCount:      isDark ? 'rgba(255,255,255,0.3)'  : '#9ca3af',
    footerBg:       isDark ? '#131720'                : '#f9fafb',
    footerBdr:      isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
  };

  const btnColors: Colors = {
    btnColor:       colors.btnColor,
    btnActiveBg:    colors.btnActiveBg,
    btnActiveColor: colors.btnActiveColor,
    btnHoverBg:     colors.btnHoverBg,
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, bulletList: {}, orderedList: {}, blockquote: {}, code: {}, codeBlock: {} }),
      Underline,
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write the job description here…' }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('URL', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const wordCount = editor.getText().trim().split(/\s+/).filter(Boolean).length;

  const activeTextColor = editor.getAttributes('textStyle').color ?? '';
  const activeHighlight = editor.getAttributes('highlight').color ?? '';
  const activeFontSize  = editor.getAttributes('textStyle').fontSize ?? '';

  const btn = (
    title: string,
    onClick: () => void,
    icon: React.ReactNode,
    active?: boolean,
    disabled?: boolean,
  ) => (
    <ToolbarButton key={title} title={title} onClick={onClick} active={active} disabled={disabled} colors={btnColors}>
      {icon}
    </ToolbarButton>
  );

  return (
    <div data-rte-id={uid} style={{ border: colors.border, borderRadius: '10px', overflow: 'hidden', background: colors.bg }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1px',
        padding: '6px 8px', borderBottom: `1px solid ${colors.toolbarBdr}`, background: colors.toolbarBg,
      }}>
        {btn('Undo', () => editor.chain().focus().undo().run(), <Undo2 size={14} />, false, !editor.can().undo())}
        {btn('Redo', () => editor.chain().focus().redo().run(), <Redo2 size={14} />, false, !editor.can().redo())}

        <Sep color={colors.divider} />

        {btn('Heading 2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={14} />, editor.isActive('heading', { level: 2 }))}
        {btn('Heading 3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={14} />, editor.isActive('heading', { level: 3 }))}

        <Sep color={colors.divider} />

        {btn('Bold (⌘B)',    () => editor.chain().focus().toggleBold().run(),      <Bold size={14} />,        editor.isActive('bold'))}
        {btn('Italic (⌘I)', () => editor.chain().focus().toggleItalic().run(),    <Italic size={14} />,      editor.isActive('italic'))}
        {btn('Underline',   () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={14} />, editor.isActive('underline'))}
        {btn('Strikethrough', () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={14} />, editor.isActive('strike'))}

        <Sep color={colors.divider} />

        {/* Text colour picker */}
        <ColorPicker
          icon={<Palette size={14} />}
          title="Text Color"
          swatches={TEXT_COLORS}
          activeColor={activeTextColor}
          isDark={isDark}
          btnColors={btnColors}
          onSelect={(color) => {
            if (!color) editor.chain().focus().unsetColor().run();
            else editor.chain().focus().setColor(color).run();
          }}
        />

        {/* Highlight picker */}
        <ColorPicker
          icon={<Highlighter size={14} />}
          title="Highlight"
          swatches={HIGHLIGHT_COLORS}
          activeColor={activeHighlight}
          isDark={isDark}
          btnColors={btnColors}
          onSelect={(color) => {
            if (!color) editor.chain().focus().unsetHighlight().run();
            else editor.chain().focus().toggleHighlight({ color }).run();
          }}
        />

        {/* Font size picker */}
        <FontSizePicker
          activeSize={activeFontSize}
          isDark={isDark}
          btnColors={btnColors}
          onSelect={(size) => {
            if (!size) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(size).run();
          }}
        />

        <Sep color={colors.divider} />

        {btn('Bullet List',    () => editor.chain().focus().toggleBulletList().run(),  <List size={14} />,        editor.isActive('bulletList'))}
        {btn('Numbered List',  () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={14} />, editor.isActive('orderedList'))}

        <Sep color={colors.divider} />

        {btn('Align Left',   () => editor.chain().focus().setTextAlign('left').run(),   <AlignLeft size={14} />,   editor.isActive({ textAlign: 'left' }))}
        {btn('Center',       () => editor.chain().focus().setTextAlign('center').run(), <AlignCenter size={14} />, editor.isActive({ textAlign: 'center' }))}
        {btn('Align Right',  () => editor.chain().focus().setTextAlign('right').run(),  <AlignRight size={14} />,  editor.isActive({ textAlign: 'right' }))}

        <Sep color={colors.divider} />

        {btn('Blockquote',     () => editor.chain().focus().toggleBlockquote().run(),    <Quote size={14} />, editor.isActive('blockquote'))}
        {btn('Inline Code',    () => editor.chain().focus().toggleCode().run(),          <Code size={14} />,  editor.isActive('code'))}
        {btn('Insert Link',    setLink,                                                  <Link2 size={14} />, editor.isActive('link'))}
        {btn('Divider Line',   () => editor.chain().focus().setHorizontalRule().run(),   <Minus size={14} />)}

        <Sep color={colors.divider} />

        {btn('Clear Formatting', () => editor.chain().focus().clearNodes().unsetAllMarks().run(), <RemoveFormatting size={14} />)}
      </div>

      {/* Editor body */}
      <EditorContent
        editor={editor}
        style={{ minHeight, padding: '16px 18px', fontSize: '15px', lineHeight: 1.75, cursor: 'text' }}
      />

      {/* Footer */}
      <div style={{
        padding: '6px 16px', borderTop: `1px solid ${colors.footerBdr}`,
        background: colors.footerBg, textAlign: 'right',
        fontSize: '12px', color: colors.wordCount,
      }}>
        {wordCount} word{wordCount !== 1 ? 's' : ''}
      </div>

      {/* Scoped styles */}
      <style>{`
        [data-rte-id="${uid}"] .tiptap { outline: none; color: ${colors.text} !important; }
        [data-rte-id="${uid}"] .tiptap * { box-sizing: border-box; }
        [data-rte-id="${uid}"] .tiptap p  { margin: 0 0 10px; color: ${colors.text}; }
        [data-rte-id="${uid}"] .tiptap h2 { font-size: 20px; font-weight: 700; margin: 20px 0 8px; color: ${colors.heading}; }
        [data-rte-id="${uid}"] .tiptap h3 { font-size: 17px; font-weight: 700; margin: 16px 0 6px; color: ${colors.heading}; }
        [data-rte-id="${uid}"] .tiptap ul,
        [data-rte-id="${uid}"] .tiptap ol { padding-left: 24px; margin: 0 0 10px; color: ${colors.text}; }
        [data-rte-id="${uid}"] .tiptap li { margin-bottom: 4px; }
        [data-rte-id="${uid}"] .tiptap a  { color: ${colors.link}; text-decoration: underline; }
        [data-rte-id="${uid}"] .tiptap hr { border: none; border-top: 1px solid ${colors.hr}; margin: 18px 0; }
        [data-rte-id="${uid}"] .tiptap strong { font-weight: 700; }
        [data-rte-id="${uid}"] .tiptap em { font-style: italic; }
        [data-rte-id="${uid}"] .tiptap code {
          background: ${colors.code}; color: ${colors.codeText};
          padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: monospace;
        }
        [data-rte-id="${uid}"] .tiptap pre {
          background: ${colors.code}; color: ${colors.codeText};
          padding: 12px 16px; border-radius: 8px; font-family: monospace;
          font-size: 13px; overflow-x: auto; margin: 0 0 12px;
        }
        [data-rte-id="${uid}"] .tiptap pre code { background: none; padding: 0; }
        [data-rte-id="${uid}"] .tiptap blockquote {
          border-left: 3px solid ${colors.quoteBorder};
          background: ${colors.quote};
          margin: 0 0 12px; padding: 10px 16px;
          border-radius: 0 6px 6px 0;
          color: ${colors.quoteText}; font-style: italic;
        }
        [data-rte-id="${uid}"] .tiptap mark {
          border-radius: 3px; padding: 1px 2px;
        }
        [data-rte-id="${uid}"] .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: ${colors.placeholder};
          pointer-events: none; float: left; height: 0;
        }
      `}</style>
    </div>
  );
}
