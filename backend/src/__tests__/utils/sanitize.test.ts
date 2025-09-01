import { sanitizeDescription } from '../../utils/sanitize';

describe('sanitizeDescription', () => {
  it('should preserve allowed HTML tags', () => {
    const input = '<p>This is a <strong>bold</strong> and <em>italic</em> text</p>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<p>This is a <strong>bold</strong> and <em>italic</em> text</p>');
  });

  it('should preserve allowed heading tags', () => {
    const input = '<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>';
    const result = sanitizeDescription(input);
    // h1 is not in allowedTags, so its text remains without the tag
    expect(result).toBe('Heading 1<h2>Heading 2</h2><h3>Heading 3</h3>');
  });

  it('should preserve lists', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol>');
  });

  it('should preserve blockquotes', () => {
    const input = '<blockquote>This is a quote</blockquote>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<blockquote>This is a quote</blockquote>');
  });

  it('should preserve code blocks', () => {
    const input = '<pre><code>console.log("Hello World");</code></pre>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<pre><code>console.log("Hello World");</code></pre>');
  });

  it('should preserve line breaks', () => {
    const input = '<p>Line 1<br>Line 2</p>';
    const result = sanitizeDescription(input);
    // sanitize-html normalizes <br> to <br />
    expect(result).toBe('<p>Line 1<br />Line 2</p>');
  });

  it('should preserve allowed links with href attribute', () => {
    const input = '<a href="https://example.com">Link text</a>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<a href="https://example.com">Link text</a>');
  });

  it('should preserve images with allowed attributes', () => {
    const input = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="Test image">';
    const result = sanitizeDescription(input);
    // sanitize-html outputs self-closing img tags
    expect(result).toBe('<img src="data:image/png;base64,iVBORw0KGgo=" alt="Test image" />');
  });

  it('should remove dangerous script tags', () => {
    const input = '<p>Safe content</p><script>alert("XSS")</script>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<p>Safe content</p>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
  });

  it('should remove dangerous onclick attributes', () => {
    const input = '<p onclick="alert(\'XSS\')">Dangerous paragraph</p>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<p>Dangerous paragraph</p>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
  });

  it('should remove javascript: links', () => {
    const input = '<a href="javascript:alert(\'XSS\')">Malicious link</a>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<a>Malicious link</a>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('alert');
  });

  it('should remove iframe tags', () => {
    const input = '<iframe src="https://malicious.com"></iframe>';
    const result = sanitizeDescription(input);
    expect(result).toBeNull();
  });

  it('should remove style attributes', () => {
    const input = '<p style="color: red; background: url(javascript:alert())">Styled text</p>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<p>Styled text</p>');
    expect(result).not.toContain('style');
    expect(result).not.toContain('javascript:');
  });

  it('should remove object and embed tags', () => {
    const input = '<object data="malicious.swf"></object><embed src="malicious.swf">';
    const result = sanitizeDescription(input);
    expect(result).toBeNull();
  });

  it('should handle empty input', () => {
    const result = sanitizeDescription('');
    expect(result).toBeNull();
  });

  it('should handle null input', () => {
    const result = sanitizeDescription(null as unknown as string);
    expect(result).toBeNull();
  });

  it('should handle undefined input', () => {
    const result = sanitizeDescription(undefined as unknown as string);
    expect(result).toBeNull();
  });

  it('should preserve plain text', () => {
    const input = 'This is plain text without any HTML';
    const result = sanitizeDescription(input);
    expect(result).toBe(input);
  });

  it('should handle mixed content correctly', () => {
    const input = `
      <h2>Title</h2>
      <p>This is a paragraph with <strong>bold</strong> text.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2 with <a href="https://example.com">link</a></li>
      </ul>
      <script>alert('This should be removed')</script>
      <blockquote>A wise quote</blockquote>
    `;

    const result = sanitizeDescription(input);
    
    expect(result).toContain('<h2>Title</h2>');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<a href="https://example.com">link</a>');
    expect(result).toContain('<blockquote>A wise quote</blockquote>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should handle malformed HTML gracefully', () => {
    const input = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
    const result = sanitizeDescription(input);
    // Should not crash and should return some cleaned content
    expect(result).not.toBeNull();
    if (result) {
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('should handle data URLs in images safely', () => {
    const safeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/';
    const input = `<img src="${safeDataUrl}" alt="Safe image">`;
    const result = sanitizeDescription(input);
    expect(result).toContain(safeDataUrl);
  });

  it('should remove vbscript: URLs', () => {
    const input = '<a href="vbscript:msgbox(\'XSS\')">VBScript link</a>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<a>VBScript link</a>');
    expect(result).not.toContain('vbscript:');
  });

  it('should handle case-insensitive dangerous attributes', () => {
    const input = '<P ONCLICK="alert(\'XSS\')" onmouseover="alert(\'XSS2\')">Text</P>';
    const result = sanitizeDescription(input);
    expect(result).toBe('<p>Text</p>');
    expect(result).not.toContain('ONCLICK');
    expect(result).not.toContain('onmouseover');
  });
});
