const TITLE_MAX = 80;
const BODY_MAX = 600;
const URL_MAX = 2048;

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rebrand.ly", "tiny.cc", "shorturl.at", "rb.gy", "lnkd.in",
  "s.id", "v.gd", "trib.al", "ow.ly", "soo.gd", "tiny.one", "t.ly",
]);

const RULES = [
  { id: "scam_seed", re: /\b(seed\s*phrase|recovery\s*phrase|private\s*key|mnemonic)\b/i },
  { id: "scam_wallet", re: /\b(connect\s+(your\s+)?wallet|verify\s+(your\s+)?(wallet|seed|phrase))\b/i },
  { id: "scam_airdrop", re: /\b(free\s+(crypto|bitcoin|eth|ton)\s*airdrop|double\s+your\s+(money|btc|bitcoin|crypto|stars))\b/i },
  { id: "phish_login", re: /\b(verify\s+(your\s+)?account|confirm\s+(your\s+)?password|update\s+your\s+billing)\b/i },
  { id: "malware", re: /\b(malware|ransomware|stealer|keylogger|remote\s+access\s+trojan)\b/i },
  { id: "csam", re: /\b(csam|child\s*porn|child\s*sexual|preteen|underage\s+sex|loli)\b/i },
  { id: "exploit", re: /\b(zero[- ]day\s+exploit|inject\s+malware|crack\s+license\s+key)\b/i },
];

const KINDS = new Set(["promo", "notice", "link"]);

function isIpv4(host) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function isBlockedHost(host) {
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;
  if (host.includes(":")) return true;
  if (isIpv4(host)) return true;
  if (!host.includes(".")) return true;
  if (SHORTENERS.has(host)) return true;
  for (const s of SHORTENERS) {
    if (host.endsWith(`.${s}`)) return true;
  }
  return false;
}

export function validateHttpsUrl(raw) {
  if (raw == null || raw === "") return { ok: false, reason: "url_empty" };
  if (typeof raw !== "string") return { ok: false, reason: "url_type" };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "url_empty" };
  if (trimmed.length > URL_MAX) return { ok: false, reason: "url_long" };
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return { ok: false, reason: "url_control" };
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, reason: "url_parse" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "url_https" };
  if (u.username || u.password) return { ok: false, reason: "url_userinfo" };
  const host = String(u.hostname || "").toLowerCase();
  if (isBlockedHost(host)) return { ok: false, reason: "url_host" };
  if (u.port && u.port !== "443") return { ok: false, reason: "url_port" };
  return { ok: true, url: u.href };
}

export function moderateText(text, { max = BODY_MAX, field = "text" } = {}) {
  if (typeof text !== "string") return { ok: false, reason: `${field}_type` };
  const t = text.replace(/\r\n/g, "\n").replace(/\0/g, "").trim();
  if (!t) return { ok: false, reason: `${field}_empty` };
  if (t.length > max) return { ok: false, reason: `${field}_long` };
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(t)) return { ok: false, reason: `${field}_control` };
  for (const rule of RULES) {
    if (rule.re.test(t)) return { ok: false, reason: rule.id };
  }
  return { ok: true, text: t };
}

export function moderateTitle(text) {
  return moderateText(text, { max: TITLE_MAX, field: "title" });
}

export function moderateBody(text) {
  return moderateText(text, { max: BODY_MAX, field: "body" });
}

export function moderateKind(kind) {
  if (typeof kind !== "string" || !KINDS.has(kind)) return { ok: false, reason: "kind_invalid" };
  return { ok: true, kind };
}

export function moderatePage({ kind, title, body, ctaUrl, requireUrl = false } = {}) {
  const k = moderateKind(kind);
  if (!k.ok) return k;
  const t = moderateTitle(title);
  if (!t.ok) return t;
  const b = moderateBody(body);
  if (!b.ok) return b;
  const needUrl = requireUrl || k.kind === "link";
  let url = null;
  if (ctaUrl == null || ctaUrl === "" || ctaUrl === "/skip") {
    if (needUrl) return { ok: false, reason: "url_required" };
  } else {
    const u = validateHttpsUrl(ctaUrl);
    if (!u.ok) return u;
    url = u.url;
  }
  return { ok: true, kind: k.kind, title: t.text, body: b.text, ctaUrl: url };
}

export function reasonMessage(reason) {
  const map = {
    url_empty: "Send an https:// link, or /skip.",
    url_https: "Only https links are allowed.",
    url_host: "That host is not allowed (no IPs, localhost, or shorteners).",
    url_shortener: "URL shorteners are not allowed.",
    url_userinfo: "Links with usernames or passwords are blocked.",
    url_parse: "That does not look like a valid URL.",
    url_required: "This page type needs a destination https link.",
    url_port: "Only the default https port is allowed.",
    title_empty: "Send a short headline.",
    title_long: "Headline is too long (80 characters max).",
    body_empty: "Send the page text.",
    body_long: "Text is too long (600 characters max).",
    kind_invalid: "Choose promo, notice, or link.",
    scam_seed: "Blocked: wallet/seed-phrase language.",
    scam_wallet: "Blocked: wallet-connect / verify-wallet language.",
    scam_airdrop: "Blocked: airdrop / double-your-money language.",
    phish_login: "Blocked: phishing language.",
    malware: "Blocked: malware language.",
    csam: "Blocked: illegal content.",
    exploit: "Blocked: exploit / malware language.",
  };
  return map[reason] || "That content is not allowed.";
}

export { TITLE_MAX, BODY_MAX, URL_MAX };
