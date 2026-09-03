import { listPlans } from "./pricing.js";
import { planOverrides, createPendingRent } from "./rent.js";
import { createInvoiceLink, invoiceUrlFrom } from "./telegram.js";
import { verifyInitData, clientIp } from "./initdata.js";
import { hitRate, listLiveByOwner } from "./store.js";
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
  const cta = typeof body.ctaUrl === "string" && body.ctaUrl.trim() ? body.ctaUrl.trim() : null;
  const rent = await createPendingRent(env, {
    userId,
    kind: body.kind,
    title: body.title,
    body: body.body,
    ctaUrl: cta,
    planId: body.planId,
    origin,
    rateKey,
    theme: body.theme,
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
