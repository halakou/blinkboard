const API = "https://api.telegram.org";

export async function tgCall(env, method, body) {
  const token = env.BOT_TOKEN;
  if (!token) return { ok: false, description: "no_token" };
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
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

export async function sendInvoice(env, { chatId, title, description, payload, stars }) {
  const n = Number(stars);
  if (!Number.isInteger(n) || n < 1 || n > 2500) return { ok: false, description: "bad_stars" };
  return tgCall(env, "sendInvoice", {
    chat_id: chatId,
    title: String(title).slice(0, 32),
    description: String(description).slice(0, 255),
    payload: String(payload).slice(0, 128),
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${n} Stars`, amount: n }],
  });
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
