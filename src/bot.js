import { normalizeCode } from "./codes.js";
import { getPlan, listPlans, formatEur } from "./pricing.js";
import { moderateTitle, moderateBody, validateHttpsUrl, reasonMessage } from "./moderate.js";
import { isAdmin, parseAdminIds, rateWindow, LIMITS, clip } from "./security.js";
import {
  getSession, putSession, clearSession, hitRate, getPage, updatePage,
  getPayment, markPaid, stats, adminLog, getSetting, setSetting, bumpViews, listLiveAdmin,
} from "./store.js";
import { sendText, sendInvoice, answerCb, answerPreCheckout, kb } from "./telegram.js";
import { createPendingRent } from "./rent.js";
import { announceLive, channelPublicUrl } from "./channel.js";
import { userIsAdmin, expireCode, blockCode, notifyAdmins } from "./admin.js";
import { THEMES, normalizeTheme } from "./themes.js";

function t(lang, en, fa) {
  return lang === "fa" ? fa : en;
}

function langOf(from) {
  const c = String((from && from.language_code) || "").toLowerCase();
  return c.startsWith("fa") ? "fa" : "en";
}

async function admins(env) {
  const extra = [];
  const boot = await getSetting(env.DB, "bootstrap_admin");
  if (boot) extra.push(Number(boot));
  return { envList: env.ADMIN_IDS, extra };
}

async function maybeBootstrap(env, userId) {
  const a = await admins(env);
  if (parseAdminIds(a.envList).length || a.extra.length) return;
  await setSetting(env.DB, "bootstrap_admin", String(userId));
}

async function gated(env, userId, kind) {
  const spec = LIMITS[kind];
  const w = rateWindow(Date.now(), spec.windowMs);
  return hitRate(env.DB, `${kind}:${userId}`, w, spec.limit);
}

function ov(env) {
  const eurUsd = Number(env && env.EUR_USD);
  const starUsd = Number(env && env.STAR_USD);
  return {
    eurUsd: Number.isFinite(eurUsd) && eurUsd > 0 ? eurUsd : undefined,
    starUsd: Number.isFinite(starUsd) && starUsd > 0 ? starUsd : undefined,
  };
}

function planKeyboard(lang, env) {
  const plans = listPlans(ov(env));
  const rows = [];
  for (let i = 0; i < plans.length; i += 1) {
    const p = plans[i];
    const label = `${p.label} · ${formatEur(p.eurCents)} · ${p.stars}⭐`;
    rows.push([{ text: label, callback_data: `plan:${p.id}` }]);
  }
  rows.push([{ text: t(lang, "Cancel", "لغو"), callback_data: "cancel" }]);
  return kb(rows);
}

function themeKeyboard(lang) {
  const row = THEMES.map((th) => ({
    text: lang === "fa" ? th.fa : th.label,
    callback_data: `theme:${th.id}`,
  }));
  return kb([row.slice(0, 2), row.slice(2), [{ text: t(lang, "Cancel", "لغو"), callback_data: "cancel" }]]);
}

function kindKeyboard(lang) {
  return kb([
    [{ text: t(lang, "Promo", "تبلیغ"), callback_data: "kind:promo" }, { text: t(lang, "Notice", "اطلاع"), callback_data: "kind:notice" }],
    [{ text: t(lang, "Link page", "صفحه لینک"), callback_data: "kind:link" }],
    [{ text: t(lang, "Cancel", "لغو"), callback_data: "cancel" }],
  ]);
}

function helpText(lang) {
  return t(
    lang,
    "Blinkboard rents a public page for a few hours. No account.\n\nMenu / Mini App — form and Stars\n/new — same in chat (photo too)\n/cancel — stop\n/rules — blocked content\n\nPaid pages go live at /a/XXXX and on the public channel @Blinkboards until they expire.",
    "Blinkboard یک صفحهٔ عمومی موقت اجاره می‌دهد. بدون حساب.\n\nمنو / مینی‌اپ — فرم و استارز\n/new — همان در چت (با عکس)\n/cancel — توقف\n/rules — موارد ممنوع\n\nصفحهٔ پرداخت‌شده در /a/XXXX و کانال عمومی @Blinkboards زنده می‌ماند تا منقضی شود."
  );
}

function startText(lang) {
  return t(
    lang,
    "Blinkboard — rent a public page from Telegram.\n\nMini App, this chat, or watch live pages on @Blinkboards. Pay Stars. Get blinkboard.pages.dev/a/XXXX. When time is up, page and channel post are gone.\n\n1 hour €0.10 · 6h €0.25 · 24h €0.79 · 3d €1.99 · 7d €3.99",
    "Blinkboard — از تلگرام یک صفحهٔ عمومی اجاره کن.\n\nمینی‌اپ، همین چت، یا صفحات زنده در @Blinkboards. استارز بپرداز. آدرس blinkboard.pages.dev/a/XXXX. وقت که تمام شود صفحه و پست کانال خاموش می‌شوند.\n\n۱ ساعت €0.10 · ۶ساعت €0.25 · ۲۴ساعت €0.79 · ۳روز €1.99 · ۷روز €3.99"
  );
}

async function startKeyboard(lang, origin, env, userId) {
  const site = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  const ch = channelPublicUrl(env) || "https://t.me/Blinkboards";
  const rows = [
    [{ text: t(lang, "Open Mini App", "باز کردن مینی‌اپ"), web_app: { url: `${site}/app` } }],
    [{ text: t(lang, "Rent in chat", "اجاره در چت"), callback_data: "new" }],
    [
      { text: t(lang, "Live channel", "کانال زنده"), url: ch },
      { text: t(lang, "Website", "سایت"), url: site },
    ],
    [{ text: t(lang, "How it works", "روش کار"), callback_data: "help" }],
  ];
  if (userId && (await userIsAdmin(env, userId))) {
    rows.splice(1, 0, [{ text: t(lang, "Admin panel", "پنل ادمین"), web_app: { url: `${site}/admin` } }]);
  }
  return kb(rows);
}

async function beginNew(env, chatId, userId, lang) {
  const np = await gated(env, userId, "newPage");
  if (!np.ok) {
    await sendText(env, chatId, t(lang, "Daily page limit reached.", "سقف روزانه پر شده."));
    return { ok: true };
  }
  await putSession(env.DB, userId, "plan", {});
  await sendText(env, chatId, t(lang, "How long should this page stay up?", "صفحه چند ساعت بالا بماند؟"), {
    reply_markup: planKeyboard(lang, env),
  });
  return { ok: true };
}

export async function handleUpdate(env, update, origin) {
  if (update.pre_checkout_query) return handlePreCheckout(env, update.pre_checkout_query);
  if (update.callback_query) return handleCallback(env, update.callback_query, origin);
  if (update.message) return handleMessage(env, update.message, origin);
  return { ok: true, ignored: true };
}

async function handleMessage(env, message, origin) {
  const from = message.from;
  const userId = from && from.id;
  const chatId = message.chat && message.chat.id;
  if (!userId || !chatId || message.chat.type !== "private") return { ok: true };
  const lang = langOf(from);
  await maybeBootstrap(env, userId);

  if (message.successful_payment) {
    return handlePaid(env, message, origin, lang);
  }

  const rate = await gated(env, userId, "userMsg");
  if (!rate.ok) {
    await sendText(env, chatId, t(lang, "Slow down. Try again in a few minutes.", "کمی صبر کن و دوباره تلاش کن."));
    return { ok: true, limited: true };
  }

  const text = typeof message.text === "string" ? message.text.trim() : "";
  const cmd = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  if (cmd === "/cancel") {
    await clearSession(env.DB, userId);
    await sendText(env, chatId, t(lang, "Cancelled.", "لغو شد."));
    return { ok: true };
  }
  if (cmd === "/help") {
    await sendText(env, chatId, helpText(lang));
    return { ok: true };
  }
  if (cmd === "/new") {
    return beginNew(env, chatId, userId, lang);
  }
  if (cmd === "/start") {
    const payload = text.split(/\s+/).slice(1).join(" ").toLowerCase();
    if (payload === "new") return beginNew(env, chatId, userId, lang);
    await sendText(env, chatId, startText(lang), { reply_markup: await startKeyboard(lang, origin, env, userId) });
    return { ok: true };
  }
  if (cmd === "/whoami") {
    const admin = await userIsAdmin(env, userId);
    await sendText(env, chatId, admin ? `admin ${userId}` : `user ${userId}`);
    return { ok: true };
  }
  if (cmd === "/support") {
    const rest = text.replace(/^\/support(@\w+)?/i, "").trim() || "(empty)";
    await notifyAdmins(env, `Support ${userId}: ${rest}`);
    await sendText(env, chatId, t(lang, "Sent to the operator.", "برای اپراتور فرستاده شد."));
    return { ok: true };
  }
  if (cmd === "/rules") {
    await sendText(env, chatId, t(lang, "No spam, phishing, malware, scams, or illegal content. https links only. No shorteners. No free HTML. Live pages are also listed on @Blinkboards until expiry. Admin can expire or block instantly.", "اسپم، فیشینگ، بدافزار، کلاهبرداری و محتوای غیرقانونی ممنوع. فقط لینک https. بدون کوتاه‌کننده. بدون HTML آزاد. صفحات زنده تا انقضا در @Blinkboards هم می‌آیند. ادمین می‌تواند فوری مسدود کند."));
    return { ok: true };
  }
  if (cmd === "/stats" || cmd === "/block" || cmd === "/expire" || cmd === "/live") {
    return handleAdmin(env, message, lang);
  }

  const ses = await getSession(env.DB, userId);
  if (ses.state === "title") {
    const m = moderateTitle(text);
    if (!m.ok) {
      await sendText(env, chatId, reasonMessage(m.reason));
      return { ok: true };
    }
    ses.data.title = m.text;
    await putSession(env.DB, userId, "body", ses.data);
    await sendText(env, chatId, t(lang, "Now the body text (max 600 characters).", "متن صفحه را بفرست (حداکثر ۶۰۰ نویسه)."));
    return { ok: true };
  }
  if (ses.state === "body") {
    const m = moderateBody(text);
    if (!m.ok) {
      await sendText(env, chatId, reasonMessage(m.reason));
      return { ok: true };
    }
    ses.data.body = m.text;
    await putSession(env.DB, userId, "image", ses.data);
    await sendText(env, chatId, t(lang, "Send a photo, or /skip.", "یک عکس بفرست، یا /skip."));
    return { ok: true };
  }
  if (ses.state === "image") {
    if (cmd === "/skip") {
      ses.data.imageFileId = null;
      await putSession(env.DB, userId, "url", ses.data);
      await sendText(env, chatId, t(lang, "Optional https link, or /skip.", "لینک https اختیاری، یا /skip."));
      return { ok: true };
    }
    const photo = Array.isArray(message.photo) ? message.photo[message.photo.length - 1] : null;
    const doc = message.document;
    const imageDoc = doc && /^image\/(jpeg|png|webp)$/i.test(String(doc.mime_type || "")) ? doc : null;
    const fileId = (photo && photo.file_id) || (imageDoc && imageDoc.file_id) || "";
    const fileSize = (photo && photo.file_size) || (imageDoc && imageDoc.file_size) || 0;
    if (!fileId) {
      await sendText(env, chatId, t(lang, "Send a photo, or /skip.", "یک عکس بفرست، یا /skip."));
      return { ok: true };
    }
    if (fileSize > 2_500_000) {
      await sendText(env, chatId, t(lang, "Photo is too large (2.5 MB max).", "عکس بزرگ است."));
      return { ok: true };
    }
    ses.data.imageFileId = fileId;
    await putSession(env.DB, userId, "url", ses.data);
    await sendText(env, chatId, t(lang, "Optional https link, or /skip.", "لینک https اختیاری، یا /skip."));
    return { ok: true };
  }
  if (ses.state === "url") {
    if (cmd === "/skip") ses.data.ctaUrl = null;
    else {
      const u = validateHttpsUrl(text);
      if (!u.ok) {
        await sendText(env, chatId, reasonMessage(u.reason));
        return { ok: true };
      }
      ses.data.ctaUrl = u.url;
    }
    return checkout(env, chatId, userId, ses.data, origin, lang);
  }

  await sendText(env, chatId, helpText(lang));
  return { ok: true };
}

async function handleCallback(env, cq, origin) {
  const userId = cq.from && cq.from.id;
  const chatId = cq.message && cq.message.chat && cq.message.chat.id;
  const data = String(cq.data || "");
  const lang = langOf(cq.from);
  if (!userId || !chatId) return { ok: true };
  await answerCb(env, cq.id);
  if (data === "cancel") {
    await clearSession(env.DB, userId);
    await sendText(env, chatId, t(lang, "Cancelled.", "لغو شد."));
    return { ok: true };
  }
  if (data === "help") {
    await sendText(env, chatId, helpText(lang));
    return { ok: true };
  }
  if (data === "new") {
    return beginNew(env, chatId, userId, lang);
  }
  const ses = await getSession(env.DB, userId);
  if (data.startsWith("plan:") && ses.state === "plan") {
    const plan = getPlan(data.slice(5), ov(env));
    if (!plan) {
      await sendText(env, chatId, t(lang, "Unknown plan.", "پلن نامعتبر."));
      return { ok: true };
    }
    ses.data.planId = plan.id;
    await putSession(env.DB, userId, "kind", ses.data);
    await sendText(env, chatId, t(lang, "What kind of page?", "نوع صفحه؟"), { reply_markup: kindKeyboard(lang) });
    return { ok: true };
  }
  if (data.startsWith("kind:") && ses.state === "kind") {
    const kind = data.slice(5);
    if (!["promo", "notice", "link"].includes(kind)) return { ok: true };
    ses.data.kind = kind;
    await putSession(env.DB, userId, "theme", ses.data);
    await sendText(env, chatId, t(lang, "Pick a look for the page.", "سبک صفحه را انتخاب کن."), { reply_markup: themeKeyboard(lang) });
    return { ok: true };
  }
  if (data.startsWith("theme:") && ses.state === "theme") {
    ses.data.theme = normalizeTheme(data.slice(6));
    await putSession(env.DB, userId, "priv", ses.data);
    await sendText(env, chatId, t(lang, "Public on @Blinkboards, or private (+5 Stars)?", "عمومی در کانال، یا خصوصی (+۵ استارز)؟"), {
      reply_markup: kb([
        [{ text: t(lang, "Public (channel)", "عمومی (کانال)"), callback_data: "priv:0" }],
        [{ text: t(lang, "Private +5⭐", "خصوصی +۵⭐"), callback_data: "priv:1" }],
        [{ text: t(lang, "Cancel", "لغو"), callback_data: "cancel" }],
      ]),
    });
    return { ok: true };
  }
  if (data.startsWith("priv:") && ses.state === "priv") {
    ses.data.privatePage = data.slice(5) === "1";
    await putSession(env.DB, userId, "title", ses.data);
    await sendText(env, chatId, t(lang, "Send a headline (max 80 characters).", "تیتر را بفرست (حداکثر ۸۰ نویسه)."));
    return { ok: true };
  }
  return { ok: true };
}

async function checkout(env, chatId, userId, data, origin, lang) {
  const rent = await createPendingRent(env, {
    userId,
    kind: data.kind,
    title: data.title,
    body: data.body,
    ctaUrl: data.ctaUrl,
    planId: data.planId,
    imageFileId: data.imageFileId,
    origin,
    skipNewLimit: true,
    theme: data.theme,
    privatePage: !!data.privatePage,
  });
  if (!rent.ok) {
    if (rent.error === "plan") {
      await sendText(env, chatId, t(lang, "Pick a duration again with /new.", "دوباره /new بزن."));
    } else if (rent.error === "photo") {
      await sendText(env, chatId, t(lang, "Could not store that photo. /skip or send another.", "عکس ذخیره نشد. /skip یا عکس دیگر."));
      await putSession(env.DB, userId, "image", data);
    } else if (rent.error === "rate" || rent.error === "limit") {
      await sendText(env, chatId, t(lang, "Too many invoices. Wait a bit.", "فاکتور زیاد. کمی صبر کن."));
    } else {
      await sendText(env, chatId, reasonMessage(rent.error));
      await putSession(env.DB, userId, "url", data);
    }
    return { ok: true };
  }
  const { code, payload, plan, title } = rent;
  const invRes = await sendInvoice(env, {
    chatId,
    title: clip(`Blinkboard ${plan.label}`, 32),
    description: clip(`${title} · live ${plan.label} · ${origin}/a/${code}`, 255),
    payload,
    stars: plan.stars,
  });
  if (!invRes || !invRes.ok) {
    await sendText(env, chatId, t(lang, "Could not create the Stars invoice. Try /new later.", "فاکتور استارز ساخته نشد. بعداً /new."));
    return { ok: true, invoice: invRes };
  }
  await sendText(
    env,
    chatId,
    t(
      lang,
      `Pay ${plan.stars} Stars (${formatEur(plan.eurCents)}) to publish. The page stays unpublished until Telegram confirms payment.`,
      `برای انتشار ${plan.stars} استارز (${formatEur(plan.eurCents)}) بپرداز. تا تأیید تلگرام صفحه منتشر نمی‌شود.`
    )
  );
  return { ok: true };
}

async function handlePreCheckout(env, q) {
  const payload = String(q.invoice_payload || "");
  const pay = await getPayment(env.DB, payload);
  if (!pay || pay.status !== "pending") {
    await answerPreCheckout(env, q.id, false, "This order is no longer valid.");
    return { ok: true };
  }
  const page = await getPage(env.DB, pay.code);
  if (!page || page.status !== "pending_pay") {
    await answerPreCheckout(env, q.id, false, "This page is no longer awaiting payment.");
    return { ok: true };
  }
  if (Number(q.total_amount) !== Number(pay.stars) || q.currency !== "XTR") {
    await answerPreCheckout(env, q.id, false, "Amount mismatch.");
    return { ok: true };
  }
  await answerPreCheckout(env, q.id, true);
  return { ok: true };
}

async function handlePaid(env, message, origin, lang) {
  const pay = message.successful_payment;
  if (!pay || pay.currency !== "XTR") return { ok: true };
  const payload = String(pay.invoice_payload || "");
  const row = await getPayment(env.DB, payload);
  const chatId = message.chat.id;
  if (!row || row.status !== "pending") {
    await sendText(env, chatId, t(lang, "Payment already processed.", "پرداخت قبلاً ثبت شده."));
    return { ok: true };
  }
  const page = await getPage(env.DB, row.code);
  const plan = getPlan(page && page.plan_id, ov(env));
  const now = Date.now();
  const ttl = plan ? plan.hours * 3600 * 1000 : 3600 * 1000;
  await markPaid(env.DB, payload, pay.telegram_payment_charge_id || "", now);
  await updatePage(env.DB, row.code, {
    status: "live",
    paid_at: now,
    expires_at: now + ttl,
    owner_id: Number(message.from && message.from.id) || page.owner_id,
  });
  await clearSession(env.DB, message.from.id);
  const url = `${origin}/a/${row.code}`;
  await sendText(
    env,
    chatId,
    t(
      lang,
      `Live for ${plan ? plan.label : "a while"}.\n${url}\nAlso posted on @Blinkboards until it expires.`,
      `منتشر شد (${plan ? plan.label : ""}).\n${url}\nتا انقضا در @Blinkboards هم هست.`
    )
  );
  if (page && !Number(page.private_page)) {
    await announceLive(env, {
      code: row.code,
      title: page.title,
      body: page.body,
      kind: page.kind,
      planLabel: plan ? plan.label : "",
      origin,
    });
  }
  return { ok: true };
}

async function handleAdmin(env, message, lang) {
  const userId = message.from.id;
  const chatId = message.chat.id;
  if (!(await userIsAdmin(env, userId))) {
    await sendText(env, chatId, t(lang, "Not an admin.", "ادمین نیستی."));
    return { ok: true };
  }
  const parts = String(message.text || "").trim().split(/\s+/);
  const cmd = parts[0].split("@")[0].toLowerCase();
  if (cmd === "/stats") {
    const s = await stats(env.DB);
    await sendText(env, chatId, `live ${s.live || 0}\nexpired ${s.expired || 0}\nblocked ${s.blocked || 0}\npending ${s.pending || 0}\nviews ${s.views || 0}\nstars ${s.stars || 0}`);
    return { ok: true };
  }
  if (cmd === "/live") {
    const rows = await listLiveAdmin(env.DB);
    if (!rows.length) {
      await sendText(env, chatId, "No live pages.");
      return { ok: true };
    }
    const lines = rows.map((r) => `${r.code} · ${r.kind} · ${r.title}`).join("\n");
    await sendText(env, chatId, clip(lines, 3500));
    return { ok: true };
  }
  const code = normalizeCode(parts[1] || "");
  if (!code) {
    await sendText(env, chatId, "Usage: /block CODE reason | /expire CODE | /live | /stats");
    return { ok: true };
  }
  if (cmd === "/expire") {
    const res = await expireCode(env, code, userId);
    await sendText(env, chatId, res.ok ? `Expired ${res.code}` : "Unknown code.");
    return { ok: true };
  }
  if (cmd === "/block") {
    const res = await blockCode(env, code, parts.slice(2).join(" "), userId);
    await sendText(env, chatId, res.ok ? `Blocked ${res.code}` : "Unknown code.");
    return { ok: true };
  }
  return { ok: true };
}

export async function publicPage(env, code, { countView = true } = {}) {
  const page = await getPage(env.DB, code);
  if (!page) return { status: 404, page: null };
  if (page.status === "live" && page.expires_at && page.expires_at <= Date.now()) {
    await updatePage(env.DB, code, { status: "expired" });
    return { status: 410, page: { ...page, status: "expired" } };
  }
  if (page.status === "live") {
    if (countView) await bumpViews(env.DB, code);
    return { status: 200, page };
  }
  if (page.status === "blocked") return { status: 404, page };
  return { status: 410, page };
}
