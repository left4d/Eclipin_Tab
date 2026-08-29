const LOCAL_ADDRESS_PATTERN = /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[[0-9a-f:]+\]|[^./\s]+\.local|[a-z0-9-]+)(?::\d+)?(?:\/|$)/i;

/**
 * NAS 和局域网页面通常只开放 HTTP；公网域名仍优先使用 HTTPS。
 */
export const normalizeEmbedUrl = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `${LOCAL_ADDRESS_PATTERN.test(trimmed) ? 'http' : 'https'}://${trimmed}`;
};

export const getValidEmbedUrl = (input: string | undefined): string | null => {
  if (!input?.trim()) return null;
  try {
    const normalized = normalizeEmbedUrl(input);
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export const getEmbedHostLabel = (input: string | undefined): string => {
  const validUrl = getValidEmbedUrl(input);
  if (!validUrl) return '';
  try {
    const parsed = new URL(validUrl);
    return parsed.host;
  } catch {
    return '';
  }
};
