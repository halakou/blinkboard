import { clip } from "./security.js";
import { tgCall, kb } from "./telegram.js";
import { updatePage } from "./store.js";

export function channelChat(env) {
  if (env.CHANNEL_ID) return env.CHANNEL_ID;
  const u = String(env.CHANNEL_USERNAME || "").replace(/^@/, "");
  return u ? `@${u}` : null;
}

export function channelPublicUrl(env) {
  const u = String(env.CHANNEL_USERNAME || "").replace(/^@/, "");
  return u ? `https://t.me/${u}` : "";
}

function excerpt(text, n = 240) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

export async function announceLive(env, { code, title, body, kind, planLabel, origin, expiresAt }) {
  const chat = channelChat(env);
  if (!chat) return null;
  const url = `${String(origin).replace(/\/$/, "")}/a/${code}`;
  const bot = String(env.BOT_USERNAME || "BlinkboardBot").replace(/^@/, "");
  const lines = [
    `LIVE · ${kind} · ${planLabel || "page"}`,
    "",
    title,
    excerpt(body),
    "",
    url,
    "",
    `Rent yours: https://t.me/${bot}`,
  ];
  const res = await tgCall(env, "sendMessage", {
    chat_id: chat,
    text: clip(lines.join("\n"), 3900),
    disable_web_page_preview: false,
    reply_markup: kb([
      [{ text: "Open page", url }],
      [{ text: "Rent a page", url: `https://t.me/${bot}` }],
    ]),
  });
  const msgId = res && res.ok && res.result && res.result.message_id;
  if (msgId) {
    await updatePage(env.DB, code, { channel_msg_id: Number(msgId) });
    return Number(msgId);
  }
  console.log(JSON.stringify({ op: "channel_announce_fail", code, description: res && res.description }));
  return null;
}

export async function dropChannelPost(env, messageId) {
  const chat = channelChat(env);
  const id = Number(messageId);
  if (!chat || !Number.isInteger(id) || id < 1) return false;
  const res = await tgCall(env, "deleteMessage", { chat_id: chat, message_id: id });
  return !!(res && res.ok);
}
