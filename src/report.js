import { clientIp } from "./initdata.js";
import { rateWindow } from "./security.js";
import { getPage, hitRate, updatePage } from "./store.js";
import { blockCode, notifyAdmins } from "./admin.js";
import { normalizeCode } from "./codes.js";

const THRESHOLD = 3;

export async function handleReport(env, request) {
  const ip = clientIp(request);
  const hit = await hitRate(env.DB, `rep:${ip}`, rateWindow(Date.now(), 10 * 60 * 1000), 8);
  if (!hit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { ok: false, error: "json" } };
  }
  const code = normalizeCode(body && body.code);
  if (!code) return { status: 400, body: { ok: false, error: "code" } };
  const page = await getPage(env.DB, code);
  if (!page || page.status !== "live") return { status: 404, body: { ok: false, error: "gone" } };
  try {
    await env.DB.prepare("INSERT INTO reports (code, ip, at) VALUES (?, ?, ?)").bind(code, ip, Date.now()).run();
  } catch {
    return { status: 200, body: { ok: true, duplicate: true } };
  }
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE code = ?").bind(code).first();
  const n = Number(row && row.n) || 1;
  await notifyAdmins(env, `Report ${code} (${n}/${THRESHOLD}) ip-hash`);
  if (n >= THRESHOLD) {
    await blockCode(env, code, "auto: reports", 0);
    await notifyAdmins(env, `Auto-blocked ${code} after ${n} reports.`);
  }
  return { status: 200, body: { ok: true, reports: n } };
}
