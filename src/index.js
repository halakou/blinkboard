import { normalizeCode } from "./codes.js";
import { secretsEqual } from "./security.js";
import { handleUpdate, publicPage } from "./bot.js";
import { renderBoard, renderGone, renderLegal, pageMarkdown, renderPreview } from "./html.js";
import { qrSvg } from "./qr.js";
import { runExpiry } from "./cron.js";
import { downloadTelegramFile } from "./telegram.js";
import { getPage } from "./store.js";
import { publicPlans, handleRentApi, handleMineApi } from "./mini.js";
import { handleAdminApi } from "./admin.js";
import { handleReport } from "./report.js";
import { listLivePublic } from "./store.js";
import {
  isWorkersDev, robotsTxt, sitemapXml, llmsTxt, llmsFull, openApiSpec, agentCard, rssFeed,
} from "./discover.js";
import { planOverrides } from "./rent.js";
import { listPlans } from "./pricing.js";
import { normalizeTheme } from "./themes.js";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

const MINI_CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://telegram.org; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors https://web.telegram.org https://telegram.org 'self'";

function hostHeaders(request) {
  if (isWorkersDev(request)) return { "X-Robots-Tag": "noindex, nofollow" };
  return {};
}

function html(body, status = 200, extra = {}, request) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": extra.cache || "no-store",
      ...SECURITY,
      ...(request ? hostHeaders(request) : {}),
    },
  });
}

function json(obj, status = 200, request) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY,
      ...(request ? hostHeaders(request) : {}),
    },
  });
}

function text(body, type, request, cache = "no-store") {
  return new Response(body, {
    headers: {
      "content-type": type,
      "cache-control": cache,
      ...SECURITY,
      ...(request ? hostHeaders(request) : {}),
    },
  });
}

export function publicOrigin(env, request) {
  if (env.PUBLIC_ORIGIN) return String(env.PUBLIC_ORIGIN).replace(/\/$/, "");
  return new URL(request.url).origin;
}

async function asset(env, request, path, extra = {}) {
  if (!env.ASSETS) return null;
  const res = await env.ASSETS.fetch(new Request("https://assets.local" + path, { method: "GET" }));
  if (!res.ok) return null;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  if (extra.csp) headers.set("Content-Security-Policy", extra.csp);
  if (extra.cache) headers.set("cache-control", extra.cache);
  else if (path.startsWith("/app/") || path.startsWith("/admin/") || path === "/index.html" || path === "/landing.css" || path === "/landing.js") {
    headers.set("cache-control", "no-store");
  }
  else if (path.startsWith("/app/")) headers.set("cache-control", "no-store");
  else if (path.endsWith(".css") || path.endsWith(".js")) headers.set("cache-control", "public, max-age=3600");
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = publicOrigin(env, request);

    if (request.method === "GET" && path === "/health") {
      return json({ ok: true, service: "blinkboard" }, 200, request);
    }
    if (request.method === "GET" && path === "/robots.txt") {
      const body = isWorkersDev(request) ? "User-agent: *\nDisallow: /\n" : robotsTxt(origin);
      return text(body, "text/plain; charset=utf-8", request, "public, max-age=300");
    }
    if (request.method === "GET" && path === "/sitemap.xml") {
      if (isWorkersDev(request)) return new Response("Not found", { status: 404, headers: SECURITY });
      return text(sitemapXml(origin), "application/xml; charset=utf-8", request, "public, max-age=300");
    }
    if (request.method === "GET" && path === "/llms.txt") {
      return text(llmsTxt(origin), "text/markdown; charset=utf-8", request, "public, max-age=300");
    }
    if (request.method === "GET" && path === "/llms-full.txt") {
      return text(llmsFull(origin, listPlans(planOverrides(env))), "text/markdown; charset=utf-8", request, "public, max-age=300");
    }
    if (request.method === "GET" && path === "/openapi.json") {
      return json(openApiSpec(origin), 200, request);
    }
    if (request.method === "GET" && (path === "/.well-known/agent-card.json" || path === "/.well-known/agent.json")) {
      return json(agentCard(origin, env), 200, request);
    }
    if (request.method === "GET" && path === "/feed.xml") {
      return text(await rssFeed(env, origin), "application/rss+xml; charset=utf-8", request, "public, max-age=60");
    }
    if (request.method === "GET" && path === "/api/live") {
      const pages = await listLivePublic(env.DB);
      return json({ ok: true, origin, pages: pages.map((p) => ({
        code: p.code, kind: p.kind, title: p.title, url: `${origin}/a/${p.code}`, expires_at: p.expires_at, views: p.views,
      })) }, 200, request);
    }
    if (request.method === "GET" && path === "/expired") {
      return html(renderGone("expired"), 200, { cache: "public, max-age=60" }, request);
    }
    if (request.method === "GET" && path === "/go") {
      const bot = env.BOT_USERNAME || "";
      if (!bot) return json({ ok: false, error: "bot_unset" }, 503);
      return Response.redirect(`https://t.me/${bot}`, 302);
    }
    if (request.method === "GET" && (path === "/rules" || path === "/terms" || path === "/privacy" || path === "/how" || path === "/pricing" || path === "/faq")) {
      return html(renderLegal(path.slice(1), origin), 200, { cache: "public, max-age=300" }, request);
    }
    const md = path.match(/^\/(how|pricing|faq|rules|terms|privacy)\.md$/);
    if (request.method === "GET" && md) {
      const body = pageMarkdown(md[1]);
      if (!body) return new Response("Not found", { status: 404, headers: SECURITY });
      return text(body, "text/markdown; charset=utf-8", request, "public, max-age=300");
    }
    if (request.method === "GET" && path === "/") {
      const page = await asset(env, request, "/index.html", { cache: "no-store" });
      if (page) return page;
    }
    if (request.method === "GET" && (path === "/landing.css" || path === "/landing.js" || path === "/page.css" || path === "/page.js")) {
      const page = await asset(env, request, path);
      if (page) return page;
    }
    const themeCss = path.match(/^\/themes\/([a-z]+)\.css$/);
    if (request.method === "GET" && themeCss) {
      const id = normalizeTheme(themeCss[1]);
      const page = await asset(env, request, `/themes/${id}.css`, { cache: "public, max-age=3600" });
      if (page) return page;
    }
    const prev = path.match(/^\/preview\/([a-z]+)$/);
    if (request.method === "GET" && prev) {
      return html(renderPreview(prev[1], origin), 200, { cache: "no-store" }, request);
    }
    if (
      request.method === "GET" &&
      (path === "/logo.svg" ||
        path === "/logo.png" ||
        path === "/favicon.svg" ||
        path === "/favicon-32.png" ||
        path === "/apple-touch-icon.png")
    ) {
      const page = await asset(env, request, path, { cache: "public, max-age=86400" });
      if (page) return page;
    }
    if (request.method === "GET" && (path === "/app" || path === "/app/")) {
      const page = await asset(env, request, "/app/index.html", { cache: "no-store", csp: MINI_CSP });
      if (page) return page;
    }
    if (request.method === "GET" && (path === "/admin" || path === "/admin/")) {
      const page = await asset(env, request, "/admin/index.html", { cache: "no-store", csp: MINI_CSP });
      if (page) return page;
    }
    if (request.method === "GET" && path === "/admin/admin.js") {
      const page = await asset(env, request, path, { cache: "no-store" });
      if (page) return page;
    }
    if (request.method === "GET" && (path === "/app/app.css" || path === "/app/app.js")) {
      const page = await asset(env, request, path, { cache: "no-store" });
      if (page) return page;
    }
    if (request.method === "GET" && path === "/api/plans") {
      return json({ ok: true, plans: publicPlans(env) });
    }
    if (request.method === "POST" && path === "/api/rent") {
      const res = await handleRentApi(env, request, origin);
      return json(res.body, res.status, request);
    }
    if (request.method === "POST" && path === "/api/admin") {
      const res = await handleAdminApi(env, request);
      return json(res.body, res.status, request);
    }
    if (request.method === "POST" && path === "/api/mine") {
      const res = await handleMineApi(env, request, origin);
      return json(res.body, res.status, request);
    }
    if (request.method === "POST" && path === "/api/report") {
      const res = await handleReport(env, request);
      return json(res.body, res.status, request);
    }

    const board = path.match(/^\/a\/([A-Za-z0-9]+)$/);
    if (request.method === "GET" && board) {
      const code = normalizeCode(board[1]);
      if (!code) return html(renderGone("expired"), 404);
      const found = await publicPage(env, code);
      if (found.status === 200) return html(renderBoard(found.page, origin), 200, { cache: "no-store" }, request);
      if (found.status === 410) return Response.redirect(`${origin}/expired`, 302);
      return html(renderGone("blocked"), 404, {}, request);
    }

    const qr = path.match(/^\/q\/([A-Za-z0-9]+)\.svg$/);
    if (request.method === "GET" && qr) {
      const code = normalizeCode(qr[1]);
      if (!code) return new Response("not found", { status: 404 });
      const found = await publicPage(env, code, { countView: false });
      if (found.status !== 200) return new Response("not found", { status: 404 });
      const svg = qrSvg(`${origin}/a/${code}`);
      return new Response(svg, {
        headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=60", ...SECURITY },
      });
    }

    const media = path.match(/^\/m\/([A-Za-z0-9]+)$/);
    if (request.method === "GET" && media) {
      const code = normalizeCode(media[1]);
      if (!code) return new Response("not found", { status: 404 });
      const page = await getPage(env.DB, code);
      if (!page || page.status !== "live" || !page.image_key) return new Response("not found", { status: 404 });
      if (page.expires_at && page.expires_at <= Date.now()) return new Response("gone", { status: 410 });
      if (String(page.image_key).startsWith("tg:")) {
        const file = await downloadTelegramFile(env, String(page.image_key).slice(3));
        if (!file.ok) return new Response("not found", { status: 404 });
        return new Response(file.bytes, {
          headers: {
            "content-type": file.type,
            "cache-control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
          },
        });
      }
      if (!env.MEDIA) return new Response("not found", { status: 404 });
      const obj = await env.MEDIA.get(page.image_key);
      if (!obj) return new Response("not found", { status: 404 });
      const headers = new Headers();
      headers.set("content-type", obj.httpMetadata?.contentType || "image/jpeg");
      headers.set("cache-control", "public, max-age=300");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");
      return new Response(obj.body, { headers });
    }

    if (path === "/webhook") {
      if (request.method !== "POST") return new Response("method", { status: 405, headers: { Allow: "POST" } });
      const secret = env.WEBHOOK_SECRET || "";
      const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      if (!secret || !(await secretsEqual(got, secret))) {
        return json({ ok: false }, 401);
      }
      let update;
      try {
        update = await request.json();
      } catch {
        return json({ ok: false }, 400);
      }
      ctx.waitUntil(
        handleUpdate(env, update, origin).catch((err) => {
          console.log(JSON.stringify({ op: "update_err", err: String(err && err.message || err) }));
        })
      );
      return json({ ok: true });
    }

    if (request.method === "GET" && path === "/") {
      return json({ ok: true, service: "blinkboard", hint: "landing missing" }, 500);
    }
    return new Response("Not found", { status: 404, headers: SECURITY });
  },

  async scheduled(controller, env) {
    await runExpiry(env);
  },
};
