import { listPlans } from "./pricing.js";
import { planOverrides, createPendingRent } from "./rent.js";
import { createInvoiceLink, invoiceUrlFrom, sniffImage, storePhotoInTelegram } from "./telegram.js";
import { verifyInitData, clientIp } from "./initdata.js";
import { hitRate, listLiveByOwner, getSession, putSession } from "./store.js";
import { rateWindow, clip } from "./security.js";
import { reasonMessage } from "./moderate.js";

export function publicPlans(env) {
  return listPlans(planOverrides(env)).map((p) => ({
    id: p.id,
    hours: p.hours,
    eurCents: p.eurCents,
    label: p.label,
    stars: p.stars,
  }));
}

export async function handleRentApi(env, request, origin) {
  const ip = clientIp(request);
  const ipHit = await hitRate(env.DB, `miniip:${ip}`, rateWindow(Date.now(), 10 * 60 * 1000), 20);
  if (!ipHit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { ok: false, error: "json" } };
  }
  if (!body || typeof body !== "object") return { status: 400, body: { ok: false, error: "json" } };
  const user = await verifyInitData(env.BOT_TOKEN, String(body.initData || ""));
  if (!user) return { status: 401, body: { ok: false, error: "open_chat" } };
  const userId = user.id;
  const rateKey = String(userId);
  const ses = await getSession(env.DB, userId);
  const imageFileId = ses.data && ses.data.imageFileId ? String(ses.data.imageFileId) : "";
  const cta = typeof body.ctaUrl === "string" && body.ctaUrl.trim() ? body.ctaUrl.trim() : null;
  const rent = await createPendingRent(env, {
    userId,
    kind: body.kind,
    title: body.title,
    body: body.body,
    ctaUrl: cta,
    planId: body.planId,
    imageFileId,
    origin,
    rateKey,
    theme: body.theme,
    privatePage: !!body.private,
  });
  if (!rent.ok) {
    return {
      status: rent.status || 400,
      body: { ok: false, error: rent.error, message: reasonMessage(rent.error) },
    };
  }
  const link = await createInvoiceLink(env, {
    title: clip(`Blinkboard ${rent.plan.label}`, 32),
    description: clip(`${rent.title} · ${origin}/a/${rent.code}`, 255),
    payload: rent.payload,
    stars: rent.plan.stars,
  });
  const invoice_url = invoiceUrlFrom(link);
  if (!invoice_url) return { status: 502, body: { ok: false, error: "invoice" } };
  return { status: 200, body: { ok: true, invoice_url, stars: rent.plan.stars, code: rent.code } };
}

export async function handlePhotoApi(env, request) {
  const ip = clientIp(request);
  const ipHit = await hitRate(env.DB, `miniip:${ip}`, rateWindow(Date.now(), 10 * 60 * 1000), 20);
  if (!ipHit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  const ct = String(request.headers.get("content-type") || "");
  if (!ct.includes("multipart/form-data")) return { status: 400, body: { ok: false, error: "photo" } };
  let form;
  try {
    form = await request.formData();
  } catch {
    return { status: 400, body: { ok: false, error: "photo" } };
  }
  const user = await verifyInitData(env.BOT_TOKEN, String(form.get("initData") || ""));
  if (!user) return { status: 401, body: { ok: false, error: "open_chat" } };
  const userHit = await hitRate(env.DB, `photo:${user.id}`, rateWindow(Date.now(), 10 * 60 * 1000), 8);
  if (!userHit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  const file = form.get("photo");
  if (!file || typeof file.arrayBuffer !== "function") return { status: 400, body: { ok: false, error: "photo" } };
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) return { status: 400, body: { ok: false, error: "photo_type" } };
  if (buf.byteLength > 2_500_000) return { status: 413, body: { ok: false, error: "photo_size" } };
  const fileId = await storePhotoInTelegram(env, user.id, buf, `cover.${kind.ext}`, kind.mime);
  if (!fileId) return { status: 502, body: { ok: false, error: "photo_store" } };
  const ses = await getSession(env.DB, user.id);
  await putSession(env.DB, user.id, ses.state || "idle", { ...ses.data, imageFileId: fileId });
  return { status: 200, body: { ok: true } };
}

export async function handleMineApi(env, request, origin) {
  const ip = clientIp(request);
  const ipHit = await hitRate(env.DB, `miniip:${ip}`, rateWindow(Date.now(), 10 * 60 * 1000), 40);
  if (!ipHit.ok) return { status: 429, body: { ok: false, error: "rate" } };
  let body;
  try {
    body = await request.json();
  } catch {
    return { status: 400, body: { ok: false, error: "json" } };
  }
  const user = await verifyInitData(env.BOT_TOKEN, String((body && body.initData) || ""));
  if (!user) return { status: 401, body: { ok: false, error: "open_chat" } };
  const rows = await listLiveByOwner(env.DB, user.id);
  const o = String(origin || "").replace(/\/$/, "");
  return {
    status: 200,
    body: {
      ok: true,
      pages: rows.map((p) => ({
        code: p.code,
        kind: p.kind,
        title: p.title,
        theme: p.theme,
        url: o + "/a/" + p.code,
        expires_at: p.expires_at,
        views: p.views,
      })),
    },
  };
}
