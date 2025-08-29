export function toPlainText(html: string): string {
  if (!html) return ''
  // Use a detached DOM element to decode entities and strip tags safely in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return (el.textContent || el.innerText || '').trim()
  }
  // Fallback: very basic strip if no DOM available (SSR not expected here)
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function truncate(text: string, max = 100): string {
  if (text.length <= max) return text
  // Avoid breaking surrogate pairs
  let end = max
  const charCode = text.charCodeAt(end - 1)
  // If high surrogate at end-1, back up one
  if (charCode >= 0xd800 && charCode <= 0xdbff) end -= 1
  return text.slice(0, end) + '...'
}

