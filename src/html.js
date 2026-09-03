import { escapeHtml, escapeAttr } from "./escape.js";
import { formatEur, listPlans } from "./pricing.js";
import { normalizeTheme, themeHref, THEMES, samplePage } from "./themes.js";

function layout({ title, body, extraCss = "", origin, description = "", path = "/" }) {
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  const url = o + path;
  const desc = description || "Rent a temporary public page from Telegram. Pay Stars. Auto-expires.";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="theme-color" content="#0d1117"/>
<meta name="description" content="${escapeAttr(desc)}"/>
<link rel="canonical" href="${escapeAttr(url)}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escapeAttr(title)}"/>
<meta property="og:description" content="${escapeAttr(desc)}"/>
<meta property="og:url" content="${escapeAttr(url)}"/>
<meta property="og:image" content="${escapeAttr(o + "/logo.png")}"/>
<meta name="twitter:card" content="summary"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="alternate" type="text/markdown" href="${escapeAttr(path === "/" ? "/llms.txt" : path + ".md")}"/>
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/landing.css?v=5"/>
${extraCss}
</head>
<body>
<header class="bar">
  <a class="brand" href="/"><img src="/logo.svg" width="28" height="28" alt=""/>Blinkboard</a>
  <a class="go" href="/go">Open in Telegram</a>
</header>
${body}
<footer class="foot">
  <a href="/">Home</a>
  <a href="https://t.me/BlinkboardBot">Bot</a>
  <a href="https://t.me/Blinkboards">Live channel</a>
  <a href="/preview">Samples</a>
  <a href="/how">How</a>
  <a href="/pricing">Pricing</a>
  <a href="/faq">FAQ</a>
  <a href="/rules">Rules</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
</footer>
</body>
</html>`;
}

const COPY = {
  how: {
    title: "How Blinkboard works",
    path: "/how",
    description: "Rent a public page from Telegram, pay Stars, get /a/XXXX until it expires.",
    md: "Open @BlinkboardBot or the Mini App. Pick 1h–7d. Send headline, text, optional https link. Pay Telegram Stars. The page goes live at /a/XXXX and on @Blinkboards until the clock ends.",
    html: `<main class="prose"><h1>How it works</h1>
<ol><li>Open the Telegram bot or Mini App.</li><li>Pick a duration and a type (promo, notice, link).</li><li>Send a headline, text, optional photo (Mini App or chat) and https link.</li><li>We moderate spam, phishing, malware, and scams.</li><li>Pay Stars. Nothing is public until Telegram confirms.</li><li>Share <code>/a/XXXX</code>. It also appears on @Blinkboards. When time is up, both vanish.</li></ol>
<p><a class="go" href="/go">Start in Telegram</a></p></main>`,
  },
  pricing: {
    title: "Blinkboard pricing",
    path: "/pricing",
    description: "1 hour €0.10, 6 hours €0.25, 24 hours €0.79, 3 days €1.99, 7 days €3.99 in Telegram Stars.",
    md: "List prices in euros, charged as Telegram Stars: 1 hour €0.10, 6 hours €0.25, 24 hours €0.79, 3 days €1.99, 7 days €3.99.",
    html: `<main class="prose"><h1>Pricing</h1>
<p>Euros are the list price. You pay the Stars equivalent in Telegram. No site checkout.</p>
<ul><li>1 hour — €0.10</li><li>6 hours — €0.25</li><li>24 hours — €0.79</li><li>3 days — €1.99</li><li>7 days — €3.99</li></ul>
<p>Machine-readable: <a href="/api/plans">/api/plans</a></p></main>`,
  },
  faq: {
    title: "Blinkboard FAQ",
    path: "/faq",
    description: "FAQ: no accounts, Stars only, live pages expire, agents can read /api/live.",
    md: "No site accounts. Pay Telegram Stars. Pages expire automatically. Agents should use /api/plans and /api/live. Creating a page requires Telegram.",
    html: `<main class="prose"><h1>FAQ</h1>
<p><strong>Do I need an account?</strong> No. Only Telegram.</p>
<p><strong>How do I pay?</strong> Telegram Stars. The page stays unpublished until payment is confirmed.</p>
<p><strong>Where does it appear?</strong> <code>blinkboard.pages.dev/a/XXXX</code> and the channel @Blinkboards.</p>
<p><strong>Can other AIs use this?</strong> They can read <a href="/llms.txt">/llms.txt</a>, <a href="/api/live">/api/live</a>, and <a href="/openapi.json">/openapi.json</a>. Publishing still needs Stars in Telegram.</p>
<p><strong>How do I report abuse?</strong> Open the bot and send <code>/support</code>.</p></main>`,
  },
  rules: {
    title: "Rules — Blinkboard",
    path: "/rules",
    description: "No spam, phishing, malware, scams, or illegal content. https only.",
    md: "No spam, phishing, malware, scams, illegal content, free HTML, shorteners, or IP/localhost links. Admins can expire or block immediately.",
    html: `<main class="prose"><h1>Rules</h1>
<p>Pages are rented, public, and temporary. Paid pages are also posted to @Blinkboards until they expire. No free HTML. We refuse spam, phishing, malware, scams, and illegal content. Destination links must be https. URL shorteners, IP hosts, and credentialed URLs are blocked. Admin can expire or block a page immediately.</p></main>`,
  },
  terms: {
    title: "Terms — Blinkboard",
    path: "/terms",
    description: "Time-limited public pages paid in Telegram Stars, as-is.",
    md: "Blinkboard sells a time-limited public page paid in Telegram Stars. Content is your responsibility. We may refuse or remove pages. Stars follow Telegram’s payment rules; we do not run a separate refund desk.",
    html: `<main class="prose"><h1>Terms</h1>
<p>Blinkboard sells a time-limited public page. Payment is Telegram Stars and follows Telegram’s rules. Pages expire automatically. We may refuse, expire, or block content that breaks the rules. The service is provided as-is. You are responsible for what you publish. For abuse or a broken page, use <code>/support</code> in the bot.</p></main>`,
  },
  privacy: {
    title: "Privacy — Blinkboard",
    path: "/privacy",
    description: "No site accounts. Telegram user id, page content, payment reference, view counts.",
    md: "No site accounts. We store Telegram user id, page content, payment reference, and view counts. Live pages may appear on @Blinkboards. We do not sell personal data.",
    html: `<main class="prose"><h1>Privacy</h1>
<p>No site accounts. We store your Telegram user id, page content, payment reference, and aggregate view counts. Live pages may appear on @Blinkboards until expiry. Photos stay in Telegram (file_id) until the page expires. We do not sell personal data. Webhook traffic is authenticated with a secret token. Agents hitting public JSON do not receive owner ids.</p></main>`,
  },
};

export function pageMarkdown(kind) {
  const p = COPY[kind];
  if (!p) return null;
  return ["# " + p.title, "", p.md, ""].join("\n");
}

export function renderLegal(kind, origin) {
  const p = COPY[kind];
  if (!p) return null;
  return layout({ title: p.title, body: p.html, origin, description: p.description, path: p.path });
}

export function renderGone(status = "expired") {
  const title = status === "blocked" ? "Page removed" : "This Blinkboard has expired";
  const line = status === "blocked"
    ? "This board was taken down."
    : "This Blinkboard has expired. Create yours today.";
  return layout({
    title: `${title} — Blinkboard`,
    body: `<main class="prose"><h1 dir="auto">${escapeHtml(title)}</h1><p>${escapeHtml(line)}</p><p><a class="go" href="/go">Create yours today</a></p></main>`,
    path: "/expired",
    description: "This Blinkboard has expired. Rent a new page from Telegram.",
  });
}

function boardImage(page) {
  const src = String(page.image_src || "");
  if (/^\/samples\/[a-z0-9._-]+\.(?:svg|jpe?g|png|webp)$/i.test(src)) {
    return `<img class="hero" src="${escapeAttr(src)}" alt=""/>`;
  }
  if (page.image_key) {
    return `<img class="hero" src="/m/${encodeURIComponent(page.code)}" alt=""/>`;
  }
  return "";
}

export function renderBoard(page, origin) {
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  const url = page.page_url || `${o}/a/${page.code}`;
  const theme = normalizeTheme(page.theme);
  const img = boardImage(page);
  const cta = page.cta_url
    ? `<a class="cta" rel="nofollow noopener noreferrer" href="${escapeAttr(page.cta_url)}">Open link</a>`
    : "";
  const qrSrc = page.qr_src || `/q/${encodeURIComponent(page.code)}.svg`;
  const qr = `<img class="qr" src="${escapeAttr(qrSrc)}" width="160" height="160" alt="QR code for this page"/>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="theme-color" content="#0d1117"/>
<title>${escapeHtml(page.title)} — Blinkboard</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="/page.css"/>
<link rel="stylesheet" href="${escapeAttr(themeHref(theme))}"/>
</head>
<body class="theme-${escapeAttr(theme)}">
<article class="board" data-exp="${escapeAttr(page.expires_at || "")}">
  <p class="meta"><span class="kind">${escapeHtml(page.kind)}</span> <span class="left" id="left">time left</span></p>
  <h1 dir="auto">${escapeHtml(page.title)}</h1>
  ${img}
  <p class="body" dir="auto">${escapeHtml(page.body).replace(/\n/g, "<br/>")}</p>
  ${cta}
  <div class="share">${qr}<p class="url">${escapeHtml(url)}</p></div>
</article>
<p class="by">
  <a href="/"><img src="/logo.svg" width="18" height="18" alt=""/> Blinkboard</a>
  · <button type="button" class="report" id="report" data-code="${escapeAttr(page.code)}">Report abuse</button>
</p>
<script src="/page.js" defer></script>
</body>
</html>`;
}

export function renderPreview(theme, origin) {
  const t = normalizeTheme(theme);
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  return renderBoard({
    ...samplePage(t),
    expires_at: Date.now() + 6 * 3600 * 1000,
    image_key: null,
    image_src: `/samples/${t}.svg`,
    page_url: `${o}/preview/${t}`,
    qr_src: `/q/preview/${t}.svg`,
  }, o);
}

export function renderSampleIndex(origin) {
  const cards = THEMES.map((th) => {
    const s = samplePage(th.id);
    return `<a class="sample-card" href="/preview/${escapeAttr(th.id)}">
      <img src="/samples/${escapeAttr(th.id)}.svg" alt=""/>
      <strong>${escapeHtml(th.label)}</strong>
      <span>${escapeHtml(s.title)}</span>
    </a>`;
  }).join("");
  return layout({
    title: "Theme samples — Blinkboard",
    origin,
    path: "/preview",
    description: "Full Classic, 8-bit, Midnight, and Poster boards with photo, countdown, QR, and CTA.",
    body: `<main class="sample-lead"><h1>Full theme samples</h1>
<p>Same board a renter gets — photo, countdown, QR, link.</p>
<div class="samples">${cards}</div></main>`,
  });
}

export function pricingNote(overrides) {
  return listPlans(overrides).map((p) => `${p.label} ${formatEur(p.eurCents)} · ${p.stars}⭐`).join(" · ");
}
