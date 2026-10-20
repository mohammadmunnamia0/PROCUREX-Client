// Unique IDs. crypto.randomUUID only exists in secure contexts (https / localhost),
// so fall back to getRandomValues, which is available everywhere.

export function createId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) {
    try {
      return c.randomUUID();
    } catch {
      // fall through
    }
  }
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(12));
    return Date.now().toString(36) + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
