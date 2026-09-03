const enc = new TextEncoder();

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key, message) {
  const keyBytes = typeof key === "string" ? enc.encode(key) : key;
  const msgBytes = typeof message === "string" ? enc.encode(message) : message;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
}

export async function verifyInitData(botToken, initData, maxAgeSec = 86400) {
  if (!botToken || typeof initData !== "string" || !initData) return null;
  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }
  const hash = String(params.get("hash") || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete("hash");
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dataCheck = pairs.join("\n");
  const secret = await hmacSha256("WebAppData", botToken);
  const computed = hex(await hmacSha256(secret, dataCheck)).toLowerCase();
  if (computed.length !== hash.length) return null;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) return null;
  const authDate = Number(params.get("auth_date"));
  const now = Date.now() / 1000;
  if (!Number.isFinite(authDate) || authDate < 1e9 || now - authDate > maxAgeSec || authDate > now + 60) return null;
  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    return null;
  }
  const id = Number(user && user.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return { id, language_code: user.language_code || "" };
}

export function clientIp(request) {
  const cf = request.headers.get("CF-Connecting-IP");
  if (cf) return cf.trim().slice(0, 64);
  const xff = request.headers.get("X-Forwarded-For") || "";
  const first = xff.split(",")[0].trim();
  return first.slice(0, 64) || "0";
}
