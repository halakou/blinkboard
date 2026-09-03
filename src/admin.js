import { normalizeCode } from "./codes.js";
import { clip, isAdmin, parseAdminIds, rateWindow } from "./security.js";
import { verifyInitData, clientIp } from "./initdata.js";
import { getPage, updatePage, stats, adminLog, getSetting, listLiveAdmin, hitRate } from "./store.js";
import { dropChannelPost } from "./channel.js";
import { sendText } from "./telegram.js";

export async function adminIdList(env) {
  const extra = [];
  const boot = await getSetting(env.DB, "bootstrap_admin");
  if (boot) extra.push(Number(boot));
  const ids = [...parseAdminIds(env.ADMIN_IDS), ...extra];
  return [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
}

export async function userIsAdmin(env, userId) {
  const ids = await adminIdList(env);
  return isAdmin(userId, ids.join(","), []);
}

export async function notifyAdmins(env, text) {
  const ids = await adminIdList(env);
  const msg = clip(String(text || ""), 3500);
  if (!msg || !ids.length) return;
  for (const id of ids) {
    try {
      await sendText(env, id, msg);
    } catch {
      /* ignore */
    }
  }
}

export async function expireCode(env, code, adminId) {
  const c = normalizeCode(code);
  if (!c) return { ok: false, error: "code" };
  const page = await getPage(env.DB, c);
  if (!page) return { ok: false, error: "unknown" };
  if (page.channel_msg_id) await dropChannelPost(env, page.channel_msg_id);
  await updatePage(env.DB, c, { status: "expired", expires_at: Date.now(), channel_msg_id: null });
  if (page.image_key) {
    try {
      if (env.MEDIA && !String(page.image_key).startsWith("tg:")) await env.MEDIA.delete(page.image_key);
    } catch { /* ignore */ }
    await updatePage(env.DB, c, { image_key: null });
  }
  if (adminId) await adminLog(env.DB, adminId, "expire", c, "");
  return { ok: true, code: c };
}

export async function blockCode(env, code, reason, adminId) {
  const c = normalizeCode(code);
  if (!c) return { ok: false, error: "code" };
  const page = await getPage(env.DB, c);
  if (!page) return { ok: false, error: "unknown" };
  if (page.channel_msg_id) await dropChannelPost(env, page.channel_msg_id);
  const why = clip(reason || "blocked", 200);
  await updatePage(env.DB, c, {
    status: "blocked",
    blocked_at: Date.now(),
    block_reason: why,
    channel_msg_id: null,
  });
  if (adminId) await adminLog(env.DB, adminId, "block", c, why);
  return { ok: true, code: c };
}

export async function handleAdminApi(env, request) {
  const ip = clientIp(request);
  const hit = await hitRate(env.DB, `adminip:${ip}`, rateWindow(Date.now(), 10 * 60 * 1000), 60);
  if (!hit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { ok: false, error: "json" } };
  }
  if (!body || typeof body !== "object") return { status: 400, body: { ok: false, error: "json" } };
  const user = await verifyInitData(env.BOT_TOKEN, String(body.initData || ""));
  if (!user) return { status: 401, body: { ok: false, error: "open_chat" } };
  if (!(await userIsAdmin(env, user.id))) return { status: 403, body: { ok: false, error: "forbidden" } };
  const op = String(body.op || "stats");
  if (op === "stats" || op === "whoami") {
    const s = await stats(env.DB);
    return { status: 200, body: { ok: true, admin: true, id: user.id, stats: s } };
  }
  if (op === "live") {
    const pages = await listLiveAdmin(env.DB);
    return { status: 200, body: { ok: true, pages } };
  }
  if (op === "expire") {
    const res = await expireCode(env, body.code, user.id);
    return { status: res.ok ? 200 : 400, body: res };
  }
  if (op === "block") {
    const res = await blockCode(env, body.code, body.reason, user.id);
    return { status: res.ok ? 200 : 400, body: res };
  }
  return { status: 400, body: { ok: false, error: "op" } };
}
