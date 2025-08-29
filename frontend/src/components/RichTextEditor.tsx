import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  readOnly?: boolean
}

export function RichTextEditor({ value, onChange, readOnly }: RichTextEditorProps) {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Link.configure({
        autolink: true,
        protocols: ['http', 'https'],
        openOnClick: false,
        validate: href => /^https?:\/\//i.test(href)
      }),
      Placeholder.configure({
        placeholder: 'Add a description…'
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'uploaded-image'
        }
      })
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  })

  // Keep editor content in sync when value prop changes (e.g., modal reopen)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [value, editor])

  const btnBase = useMemo(() => ({
    padding: '6px 8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2 as const
  } as const), [])

  const getBtnStyle = (active?: boolean) => ({
    ...btnBase,
    backgroundColor: active ? '#111827' : btnBase.backgroundColor,
    color: active ? '#ffffff' : btnBase.color,
    borderColor: active ? '#111827' : (btnBase as any).borderColor
  })

  if (!editor) return null

  return (
    <div style={{ width: '100%' }} className="rte">
      <style>
        {`
        .rte .ProseMirror {
          color: #111827;
          outline: none !important;
          border: none !important;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          width: 100%;
          min-height: 100px;
        }
        .rte .ProseMirror:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        .rte .ProseMirror p.is-editor-empty::before {
          color: #6b7280;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .rte .ProseMirror blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
          color: #6b7280;
        }
        .rte .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rte .ProseMirror a:hover {
          color: #1d4ed8;
        }
        .rte .ProseMirror img {
          display: none;
        }
        `}
      </style>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            aria-pressed={editor.isActive('bold')}
            style={getBtnStyle(editor.isActive('bold'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            onMouseEnter={(e) => { if (!editor.isActive('bold')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('bold')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >B</button>
          <button
            type="button"
            aria-pressed={editor.isActive('italic')}
            style={getBtnStyle(editor.isActive('italic'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            onMouseEnter={(e) => { if (!editor.isActive('italic')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('italic')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >I</button>
          <button
            type="button"
            aria-pressed={editor.isActive('strike')}
            style={getBtnStyle(editor.isActive('strike'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            onMouseEnter={(e) => { if (!editor.isActive('strike')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('strike')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >S</button>
          <button
            type="button"
            aria-pressed={editor.isActive('code')}
            style={getBtnStyle(editor.isActive('code'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            onMouseEnter={(e) => { if (!editor.isActive('code')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('code')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >{'</>'}</button>

          <span style={{ width: '1px', background: '#e1e1e1', margin: '0 4px' }} />

          <button
            type="button"
            aria-pressed={editor.isActive('heading', { level: 2 })}
            style={getBtnStyle(editor.isActive('heading', { level: 2 }))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            onMouseEnter={(e) => { if (!editor.isActive('heading', { level: 2 })) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('heading', { level: 2 })) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >H2</button>
          <button
            type="button"
            aria-pressed={editor.isActive('heading', { level: 3 })}
            style={getBtnStyle(editor.isActive('heading', { level: 3 }))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            onMouseEnter={(e) => { if (!editor.isActive('heading', { level: 3 })) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('heading', { level: 3 })) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >H3</button>

          <button
            type="button"
            aria-pressed={editor.isActive('bulletList')}
            style={getBtnStyle(editor.isActive('bulletList'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            onMouseEnter={(e) => { if (!editor.isActive('bulletList')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('bulletList')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >• List</button>
          <button
            type="button"
            aria-pressed={editor.isActive('orderedList')}
            style={getBtnStyle(editor.isActive('orderedList'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            onMouseEnter={(e) => { if (!editor.isActive('orderedList')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('orderedList')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >1. List</button>
          <button
            type="button"
            aria-pressed={editor.isActive('blockquote')}
            style={getBtnStyle(editor.isActive('blockquote'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            onMouseEnter={(e) => { if (!editor.isActive('blockquote')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('blockquote')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >❝ Quote</button>

          <button
            type="button"
            aria-pressed={editor.isActive('link')}
            style={getBtnStyle(editor.isActive('link'))}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const prev = editor.getAttributes('link').href as string | undefined
              const url = window.prompt('Enter URL (https://...)', prev || 'https://') || ''
              if (!/^https?:\/\//i.test(url)) {
                // Remove link if invalid
                editor.chain().focus().unsetLink().run()
                return
              }
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
            }}
            onMouseEnter={(e) => { if (!editor.isActive('link')) e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { if (!editor.isActive('link')) e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >Link</button>

          <button
            type="button"
            style={getBtnStyle(false)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              const button = e.currentTarget as HTMLButtonElement
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (fileEvent) => {
                const file = (fileEvent.target as HTMLInputElement).files?.[0]
                if (file) {
                  // Show loading feedback
                  const originalText = button.textContent
                  button.textContent = '⏳ Loading...'
                  button.disabled = true
                  
                  const reader = new FileReader()
                  reader.onload = (readerEvent) => {
                    const src = readerEvent.target?.result as string
                    // Insert image as inline element
                    editor.chain().focus().insertContent(`<img src="${src}" alt="Uploaded image" />`).run()
                    
                    // Restore button
                    setTimeout(() => {
                      button.textContent = originalText
                      button.disabled = false
                    }, 500)
                  }
                  reader.onerror = () => {
                    // Handle error
                    button.textContent = '❌ Error'
                    setTimeout(() => {
                      button.textContent = originalText
                      button.disabled = false
                    }, 2000)
                  }
                  reader.readAsDataURL(file)
                }
              }
              input.click()
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >📷 Image</button>

          <button
            type="button"
            style={getBtnStyle(false)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid #0ea5e9' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >Clear</button>
        </div>
      )}

      <div style={{
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        padding: '12px',
        minHeight: '120px',
        background: '#ffffff'
      }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
