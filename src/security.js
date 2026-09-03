const enc = new TextEncoder();

export function parseAdminIds(raw) {
  if (!raw) return [];
  const out = [];
  for (const part of String(raw).split(/[,\s]+/)) {
    if (!part) continue;
    const n = Number(part);
    if (Number.isInteger(n) && n > 0) out.push(n);
  }
  return out;
}

export function isAdmin(userId, envAdmins, extra = []) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return false;
  const set = new Set([...parseAdminIds(envAdmins), ...extra.map(Number)]);
  return set.has(id);
}

export async function secretsEqual(a, b) {
  const left = enc.encode(String(a || ""));
  const right = enc.encode(String(b || ""));
  if (left.length !== right.length) {
    crypto.subtle ? await crypto.subtle.digest("SHA-256", left) : null;
    return false;
  }
  if (typeof crypto.subtle?.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(left, right);
  }
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function rateWindow(nowMs, windowMs) {
  const t = Number(nowMs);
  const w = Number(windowMs);
  if (!Number.isFinite(t) || !Number.isFinite(w) || w < 1) return 0;
  return Math.floor(t / w) * w;
}

export function allowRate({ count, limit }) {
  const c = Number(count) || 0;
  const l = Number(limit);
  if (!Number.isInteger(l) || l < 1) return false;
  return c < l;
}

export function telegramUserId(update) {
  const u =
    update?.message?.from ||
    update?.callback_query?.from ||
    update?.pre_checkout_query?.from ||
    update?.my_chat_member?.from;
  const id = Number(u && u.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function clip(s, n) {
  const t = String(s || "");
  return t.length <= n ? t : t.slice(0, n);
}

export const LIMITS = {
  userMsg: { windowMs: 10 * 60 * 1000, limit: 40 },
  newPage: { windowMs: 24 * 60 * 60 * 1000, limit: 8 },
  invoice: { windowMs: 10 * 60 * 1000, limit: 12 },
};
