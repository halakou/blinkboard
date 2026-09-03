const API = "https://api.telegram.org";

export function sniffImage(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return { mime: "image/webp", ext: "webp" };
  return null;
}

export function photoFileIdFromMessage(msg) {
  const photos = msg && msg.photo;
  if (Array.isArray(photos) && photos.length) {
    const best = photos[photos.length - 1];
    if (best && best.file_id) return String(best.file_id);
  }
  if (msg && msg.document && msg.document.file_id) return String(msg.document.file_id);
  return "";
}

export async function tgCall(env, method, body) {
  const token = env.BOT_TOKEN;
  if (!token) return { ok: false, description: "no_token" };
  const form = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: form ? undefined : { "content-type": "application/json" },
    body: form ? body : JSON.stringify(body || {}),
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, description: "bad_json", status: res.status };
  }
}

export function kb(rows) {
  return { inline_keyboard: rows };
}

export function replyKb(rows, extra = {}) {
  return { keyboard: rows, resize_keyboard: true, ...extra };
}

export async function sendText(env, chatId, text, extra = {}) {
  return tgCall(env, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}

export async function answerCb(env, id, text) {
  return tgCall(env, "answerCallbackQuery", { callback_query_id: id, text: text || "" });
}

export async function answerPreCheckout(env, id, ok, error) {
  const body = { pre_checkout_query_id: id, ok: !!ok };
  if (!ok && error) body.error_message = String(error).slice(0, 200);
  return tgCall(env, "answerPreCheckoutQuery", body);
}

function starsInvoiceFields({ title, description, payload, stars }) {
  const n = Number(stars);
  if (!Number.isInteger(n) || n < 1 || n > 2500) return null;
  return {
    title: String(title).slice(0, 32),
    description: String(description).slice(0, 255),
    payload: String(payload).slice(0, 128),
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${n} Stars`, amount: n }],
  };
}

export async function sendInvoice(env, { chatId, title, description, payload, stars }) {
  const fields = starsInvoiceFields({ title, description, payload, stars });
  if (!fields) return { ok: false, description: "bad_stars" };
  return tgCall(env, "sendInvoice", { chat_id: chatId, ...fields });
}

export async function createInvoiceLink(env, { title, description, payload, stars }) {
  const fields = starsInvoiceFields({ title, description, payload, stars });
  if (!fields) return { ok: false, description: "bad_stars" };
  return tgCall(env, "createInvoiceLink", fields);
}

export function invoiceUrlFrom(link) {
  const raw = link && link.ok ? link.result : null;
  if (typeof raw === "string" && raw) return raw;
  if (raw && typeof raw.url === "string" && raw.url) return raw.url;
  return null;
}

export async function storePhotoInTelegram(env, chatId, bytes, filename, mime) {
  if (!chatId) return "";
  const kind = sniffImage(bytes);
  if (!kind) return "";
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.byteLength < 32 || buf.byteLength > 2_500_000) return "";
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("disable_notification", "true");
  form.append("caption", "Cover stored in Telegram.");
  form.append("photo", new Blob([buf], { type: mime || kind.mime }), filename || `cover.${kind.ext}`);
  const data = await tgCall(env, "sendPhoto", form);
  return data && data.ok ? photoFileIdFromMessage(data.result) : "";
}

export async function downloadTelegramFile(env, fileId) {
  const info = await tgCall(env, "getFile", { file_id: fileId });
  const path = info && info.ok ? info.result && info.result.file_path : null;
  if (!path || typeof path !== "string" || path.includes("..") || path.includes("\\")) {
    return { ok: false, reason: "file_path" };
  }
  const url = `${API}/file/bot${env.BOT_TOKEN}/${path}`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false, reason: "download" };
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 32 || buf.byteLength > 2_500_000) return { ok: false, reason: "file_size" };
  let type = "image/jpeg";
  if (/\.png$/i.test(path)) type = "image/png";
  else if (/\.webp$/i.test(path)) type = "image/webp";
  else if (/\.gif$/i.test(path)) type = "image/gif";
  return { ok: true, bytes: buf, type };
}

export async function setWebhook(env, url, secret) {
  return tgCall(env, "setWebhook", {
    url,
    secret_token: secret,
    drop_pending_updates: false,
    allowed_updates: ["message", "callback_query", "pre_checkout_query"],
  });
}
