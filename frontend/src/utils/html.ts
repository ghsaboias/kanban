import { TIMEOUTS } from '../constants/timeouts'

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

export function truncate(text: string, max = TIMEOUTS.DEFAULT_TRUNCATE_LENGTH): string {
  if (text.length <= max) return text
  // Avoid breaking surrogate pairs
  let end = max
  const charCode = text.charCodeAt(end - 1)
  // If high surrogate at end-1, back up one
  if (charCode >= 0xd800 && charCode <= 0xdbff) end -= 1
  return text.slice(0, end) + '...'
}

export function hasContent(html: string): boolean {
  if (!html) return false
  const trimmed = html.trim()
  if (!trimmed) return false
  
  // Check if it's just empty paragraphs
  if (trimmed === '<p></p>' || trimmed === '<p><br></p>') return false
  
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = trimmed
    
    // Check for text content
    const textContent = (el.textContent || el.innerText || '').trim()
    if (textContent) return true
    
    // Check for images or other media
    const hasImages = el.querySelector('img') !== null
    if (hasImages) return true
    
    return false
  }
  
  // Fallback: check for images or non-empty text
  return /\S/.test(trimmed.replace(/<[^>]*>/g, '')) || /<img\s/.test(trimmed)
}

export function extractImages(html: string): string[] {
  if (!html) return []
  
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    const images = el.querySelectorAll('img')
    return Array.from(images).map(img => img.src)
  }
  
  // Fallback: regex extraction
  const matches = html.match(/<img[^>]+src="([^"]*)"[^>]*>/g)
  if (!matches) return []
  
  return matches.map(match => {
    const srcMatch = match.match(/src="([^"]*)"/)
    return srcMatch ? srcMatch[1] : ''
  }).filter(Boolean)
}

