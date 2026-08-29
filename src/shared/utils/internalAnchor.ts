const SPAN_ID_PATTERN = /^<span\s+id\s*=\s*["']([^"']+)["']\s*>\s*(?:<\/span>)?$/i;

/** Normalize the small internal-navigation anchor syntax used by stickers and widgets. */
export const normalizeInternalAnchorId = (value: string): string => {
  let normalized = value.trim();
  const spanMatch = normalized.match(SPAN_ID_PATTERN);
  if (spanMatch) normalized = spanMatch[1];
  if (normalized.startsWith('#')) normalized = normalized.slice(1);
  return normalized
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_\-:.]/gu, '')
    .slice(0, 80);
};
