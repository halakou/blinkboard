import { escapeHtml, escapeAttr } from "./escape.js";
import { formatEur, listPlans } from "./pricing.js";

function layout({ title, body, extraCss = "", origin }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="theme-color" content="#f6f1e8"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/landing.css"/>
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
  <a href="/rules">Rules</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
</footer>
</body>
</html>`;
}

export function renderLegal(kind, origin) {
  const pages = {
    rules: {
      title: "Rules — Blinkboard",
      html: `<main class="prose"><h1>Rules</h1>
<p>Pages are rented, public, and temporary. Paid pages are also posted to the public Telegram channel @Blinkboards until they expire. No free HTML. We refuse spam, phishing, malware, scams, and illegal content. Destination links must be https. URL shorteners, IP hosts, and credentialed URLs are blocked. Admin can expire or block a page immediately.</p></main>`,
    },
    terms: {
      title: "Terms — Blinkboard",
      html: `<main class="prose"><h1>Terms</h1>
<p>Blinkboard sells a time-limited public page. Payment is Telegram Stars. Pages expire automatically. We may refuse, expire, or block content that breaks the rules. The service is provided as-is. You are responsible for the content you publish.</p></main>`,
    },
    privacy: {
      title: "Privacy — Blinkboard",
      html: `<main class="prose"><h1>Privacy</h1>
<p>No site accounts. We store your Telegram user id, page content, payment reference, and aggregate view counts. Live pages may appear on the public channel @Blinkboards until expiry. Images live until expiry. We do not sell personal data. Webhook traffic is authenticated with a secret token.</p></main>`,
    },
  };
  const p = pages[kind];
  if (!p) return null;
  return layout({ title: p.title, body: p.html, origin });
}

export function renderGone(status = "expired") {
  const title = status === "blocked" ? "Page removed" : "Page expired";
  const line = status === "blocked"
    ? "This board was taken down."
    : "This board’s rental ended.";
  return layout({
    title: `${title} — Blinkboard`,
    body: `<main class="prose"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(line)}</p><p><a class="go" href="/go">Rent a new page</a></p></main>`,
  });
}

export function renderBoard(page, origin) {
  const url = `${origin}/a/${page.code}`;
  const img = page.image_key ? `<img class="hero" src="/m/${encodeURIComponent(page.code)}" alt=""/>` : "";
  const cta = page.cta_url
    ? `<a class="cta" rel="nofollow noopener noreferrer" href="${escapeAttr(page.cta_url)}">Open link</a>`
    : "";
  const qr = `<img class="qr" src="/q/${encodeURIComponent(page.code)}.svg" width="160" height="160" alt="QR code for this page"/>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="theme-color" content="#f6f1e8"/>
<title>${escapeHtml(page.title)} — Blinkboard</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="/page.css"/>
</head>
<body>
<article class="board" data-exp="${escapeAttr(page.expires_at || "")}">
  <p class="meta"><span class="kind">${escapeHtml(page.kind)}</span> <span class="left" id="left">time left</span></p>
  <h1>${escapeHtml(page.title)}</h1>
  ${img}
  <p class="body">${escapeHtml(page.body).replace(/\n/g, "<br/>")}</p>
  ${cta}
  <div class="share">${qr}<p class="url">${escapeHtml(url)}</p></div>
</article>
<p class="by"><a href="/"><img src="/logo.svg" width="18" height="18" alt=""/> Blinkboard</a> · <a href="https://t.me/Blinkboards">live channel</a> · rented page</p>
<script src="/page.js" defer></script>
</body>
</html>`;
}

export function pricingNote(overrides) {
  return listPlans(overrides).map((p) => `${p.label} ${formatEur(p.eurCents)} · ${p.stars}⭐`).join(" · ");
}
