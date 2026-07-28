import DOMPurify from 'isomorphic-dompurify';

/**
 * Tests whether a string contains actual HTML markup.
 * Matches opening tags like <div, <p, <!DOCTYPE, etc.
 * Avoids false positives from strings like "< 5 years experience".
 */
export function isHtmlString(str: string | null | undefined): boolean {
  if (!str) return false;
  return /^\s*<(?:!DOCTYPE|[a-zA-Z][a-zA-Z0-9]*[\s>\/])/i.test(str);
}

export function sanitizeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? '');
}
