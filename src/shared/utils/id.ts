/**
 * Generate a collision-resistant identifier in both secure and restricted contexts.
 * crypto.randomUUID is preferred, while getRandomValues and a timestamp fallback
 * keep imports, local previews, and older browsers functional.
 */
export function createId(prefix?: string): string {
  let id: string;

  if (globalThis.crypto?.randomUUID) {
    id = globalThis.crypto.randomUUID();
  } else if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } else {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  return prefix ? `${prefix}-${id}` : id;
}
