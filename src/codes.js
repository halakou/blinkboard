export const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LEN = 4;

export function codeFromBytes(bytes) {
  if (!bytes || bytes.length !== CODE_LEN) return null;
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

export function randomCode() {
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  return codeFromBytes(bytes);
}

export function normalizeCode(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  if (s.length !== CODE_LEN) return null;
  for (let i = 0; i < s.length; i++) {
    if (!ALPHABET.includes(s[i])) return null;
  }
  return s;
}

export function pagePath(code) {
  const c = normalizeCode(code);
  return c ? `/a/${c}` : null;
}
