import { randomCode } from "./codes.js";
import { getPlan } from "./pricing.js";
import { moderatePage } from "./moderate.js";
import { clip, rateWindow, LIMITS } from "./security.js";
import { getPage, insertPage, insertPayment, putSession, hitRate } from "./store.js";
import { downloadTelegramFile } from "./telegram.js";
import { normalizeTheme } from "./themes.js";

export function planOverrides(env) {
  const eurUsd = Number(env && env.EUR_USD);
  const starUsd = Number(env && env.STAR_USD);
  return {
    eurUsd: Number.isFinite(eurUsd) && eurUsd > 0 ? eurUsd : undefined,
    starUsd: Number.isFinite(starUsd) && starUsd > 0 ? starUsd : undefined,
  };
}

export async function uniqueCode(db) {
  for (let i = 0; i < 12; i++) {
    const code = randomCode();
    const exists = await getPage(db, code);
    if (!exists) return code;
  }
  throw new Error("code_collision");
}

export async function createPendingRent(env, { userId, kind, title, body, ctaUrl, planId, imageFileId, origin, rateKey, skipNewLimit, theme }) {
  const uid = Number(userId);
  const owner = Number.isInteger(uid) && uid > 0 ? uid : 0;
  const plan = getPlan(planId, planOverrides(env));
  if (!plan) return { ok: false, error: "plan", status: 400 };
  const mod = moderatePage({
    kind,
    title,
    body,
    ctaUrl: ctaUrl || null,
  });
  if (!mod.ok) return { ok: false, error: mod.reason || "blocked", status: 400 };

  const who = rateKey || String(owner || "anon");
  if (!skipNewLimit) {
    const day = rateWindow(Date.now(), LIMITS.newPage.windowMs);
    const np = await hitRate(env.DB, `newPage:${who}`, day, LIMITS.newPage.limit);
    if (!np.ok) return { ok: false, error: "limit", status: 429 };
  }
  const invW = rateWindow(Date.now(), LIMITS.invoice.windowMs);
  const inv = await hitRate(env.DB, `invoice:${who}`, invW, LIMITS.invoice.limit);
  if (!inv.ok) return { ok: false, error: "rate", status: 429 };

  const code = await uniqueCode(env.DB);
  let imageKey = null;
  if (imageFileId) {
    if (env.MEDIA) {
      const file = await downloadTelegramFile(env, imageFileId);
      if (!file.ok) return { ok: false, error: "photo", status: 400 };
      imageKey = `img/${code}`;
      await env.MEDIA.put(imageKey, file.bytes, { httpMetadata: { contentType: file.type } });
    } else {
      imageKey = `tg:${imageFileId}`;
    }
  }
  const payload = clip(`bb:${code}:${plan.id}:${owner}`, 128);
  const now = Date.now();
  await insertPage(env.DB, {
    code,
    owner_id: owner,
    kind: mod.kind,
    title: mod.title,
    body: mod.body,
    cta_url: mod.ctaUrl,
    image_key: imageKey,
    plan_id: plan.id,
    stars: plan.stars,
    eur_cents: plan.eurCents,
    status: "pending_pay",
    created_at: now,
    invoice_payload: payload,
    theme: normalizeTheme(theme),
  });
  await insertPayment(env.DB, {
    payload,
    user_id: owner,
    code,
    stars: plan.stars,
    status: "pending",
    created_at: now,
  });
  if (owner > 0) await putSession(env.DB, owner, "pay", { code, payload });
  return { ok: true, code, payload, plan, title: mod.title, origin };
}
