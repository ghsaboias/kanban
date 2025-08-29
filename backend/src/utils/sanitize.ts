import sanitizeHtml, { IOptions, Transformer } from 'sanitize-html'

const allowedTags = [
  'p', 'br', 'strong', 'em', 's', 'code', 'pre',
  'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'img'
]

const allowedAttributes: IOptions['allowedAttributes'] = {
  a: ['href'],
  img: ['src', 'alt', 'style']
}

const allowedSchemes = ['http', 'https', 'data']

export function sanitizeDescription(input?: string | null): string | null {
  if (input == null) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const clean = sanitizeHtml(trimmed, {
    allowedTags,
    allowedAttributes,
    allowedSchemes,
    disallowedTagsMode: 'discard',
    // Enforce safe link targets and rel
    transformTags: {
      a: ((tagName, attribs) => {
        const href = attribs.href || ''
        // Block javascript: and other schemes
        const safe = allowedSchemes.some(s => href.startsWith(s + ':'))
        const attrs: Record<string, string> = {}
        if (safe) {
          attrs.href = href
          attrs.target = '_blank'
          attrs.rel = 'noopener noreferrer'
        }
        return { tagName: 'a', attribs: attrs }
      }) as Transformer,
      img: ((tagName, attribs) => {
        const src = attribs.src || ''
        // Allow data URLs (base64 images) and http/https
        const safe = allowedSchemes.some(s => src.startsWith(s + ':'))
        const attrs: Record<string, string> = {}
        if (safe) {
          attrs.src = src
          if (attribs.alt) attrs.alt = attribs.alt
          if (attribs.style) attrs.style = attribs.style
        }
        return { tagName: 'img', attribs: attrs }
      }) as Transformer
    }
  })

  const result = clean.trim()
  if (!result || result === '<p></p>' || result === '<p><br></p>') return null
  return result
}
