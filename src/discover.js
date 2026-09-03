import { listPlans, formatEur } from "./pricing.js";
import { planOverrides } from "./rent.js";
import { listLivePublic } from "./store.js";
import { escapeHtml, escapeAttr } from "./escape.js";

export function publicHost(request, env) {
  const raw = request.headers.get("X-Forwarded-Host") || new URL(request.url).host || "";
  return String(raw).split(":")[0].toLowerCase();
}

export function isWorkersDev(request, env) {
  return publicHost(request, env).endsWith("workers.dev");
}

export function securityTxt(origin) {
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  return `Contact: https://t.me/BlinkboardBot
Contact: https://t.me/BlinkboardBot?start=support
Expires: 2027-08-01T00:00:00.000Z
Preferred-Languages: en, fa
Canonical: ${o}/.well-known/security.txt
Policy: ${o}/rules
`;
}

export function robotsTxt(publicSite) {
  if (!publicSite) {
    return "User-agent: *\nDisallow: /\n";
  }
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /api/
Disallow: /webhook
Disallow: /internal
Disallow: /m/
Disallow: /q/

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${publicSite}/sitemap.xml
`;
}

export function sitemapXml(origin) {
  const o = origin.replace(/\/$/, "");
  const paths = ["/", "/preview", "/how", "/pricing", "/faq", "/rules", "/terms", "/privacy", "/llms.txt"];
  const urls = paths
    .map(
      (p) =>
        `  <url><loc>${escapeHtml(o + p)}</loc><changefreq>weekly</changefreq></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function llmsTxt(origin) {
  const o = origin.replace(/\/$/, "");
  return `# Blinkboard

> Telegram-first rented public pages. No site accounts. Pay Telegram Stars. Pages expire automatically.

Blinkboard lets anyone rent a temporary public web page from Telegram. Durations: 1 hour, 6 hours, 24 hours, 3 days, 7 days. Prices about €0.10, €0.25, €0.79, €1.99, €3.99 paid as Stars. Content is moderated. Live pages appear at ${o}/a/XXXX and on Telegram channel @Blinkboards until expiry.

Bot: https://t.me/BlinkboardBot
Channel: https://t.me/Blinkboards
Mini App: ${o}/app

## For people

- [Home](${o}/): product
- [Theme samples](${o}/preview): Classic, 8-bit, Midnight, Poster
- [How it works](${o}/how): flow
- [Pricing](${o}/pricing): durations
- [FAQ](${o}/faq)
- [Rules](${o}/rules)

## For agents

- [OpenAPI](${o}/openapi.json)
- [Live pages JSON](${o}/api/live)
- [Plans JSON](${o}/api/plans)
- [Agent card](${o}/.well-known/agent-card.json)
- [Full text](${o}/llms-full.txt)
- [RSS](${o}/feed.xml)

Agents may read plans and live listings. Creating a page requires Telegram (Mini App or @BlinkboardBot) and a Stars payment. Do not scrape /a/XXXX as a catalog; use /api/live. Do not post spam, phishing, malware, or illegal content.
`;
}

export function llmsFull(origin, plans) {
  const o = origin.replace(/\/$/, "");
  const price = (plans || [])
    .map((p) => `- ${p.label}: ${formatEur(p.eurCents)} ≈ ${p.stars} Stars`)
    .join("\n");
  return `${llmsTxt(o)}

## Pricing

${price || "See /pricing"}

## Flow

1. Open @BlinkboardBot or ${o}/app
2. Pick duration and type (promo, notice, link)
3. Send headline, text, optional https link (photo in chat only)
4. Automated moderation
5. Pay Stars; page stays unpublished until Telegram confirms
6. Live at ${o}/a/XXXX and @Blinkboards until the clock ends

## Constraints

No free HTML. https links only. No URL shorteners, IPs, or localhost. Admins can expire or block immediately.
`;
}

export function openApiSpec(origin) {
  const o = origin.replace(/\/$/, "");
  return {
    openapi: "3.1.0",
    info: {
      title: "Blinkboard",
      version: "1.1.0",
      description:
        "Read-only machine API for Blinkboard. Publishing still requires Telegram Stars via the bot or Mini App.",
    },
    servers: [{ url: o }],
    paths: {
      "/api/plans": {
        get: {
          summary: "List rental plans and Star prices",
          responses: { "200": { description: "plans" } },
        },
      },
      "/api/live": {
        get: {
          summary: "Currently live public pages (no owner ids)",
          responses: { "200": { description: "live boards" } },
        },
      },
      "/health": { get: { summary: "Liveness", responses: { "200": { description: "ok" } } } },
    },
  };
}

export function agentCard(origin, env) {
  const o = origin.replace(/\/$/, "");
  const bot = String((env && env.BOT_USERNAME) || "BlinkboardBot").replace(/^@/, "");
  return {
    name: "Blinkboard",
    description: "Rent a temporary public page from Telegram. Read live pages and plans; create via Telegram Stars.",
    url: o,
    version: "1.1.0",
    documentationUrl: o + "/llms.txt",
    skills: [
      { id: "list-plans", description: "GET /api/plans" },
      { id: "list-live", description: "GET /api/live" },
      { id: "rent", description: `User must open https://t.me/${bot} or ${o}/app and pay Stars` },
    ],
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
  };
}

export async function rssFeed(env, origin) {
  const o = origin.replace(/\/$/, "");
  const rows = await listLivePublic(env.DB, 30);
  const items = rows
    .map((r) => {
      const link = `${o}/a/${r.code}`;
      const exp = r.expires_at ? new Date(Number(r.expires_at)).toUTCString() : "";
      return `    <item>
      <title>${escapeHtml(r.title || r.code)}</title>
      <link>${escapeHtml(link)}</link>
      <guid>${escapeHtml(link)}</guid>
      <description>${escapeHtml((r.kind || "") + (exp ? " until " + exp : ""))}</description>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blinkboard live</title>
    <link>${escapeHtml(o)}</link>
    <description>Currently live rented pages</description>
${items}
  </channel>
</rss>
`;
}

export function jsonLd(origin) {
  const o = origin.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Blinkboard",
        url: o,
        sameAs: ["https://t.me/BlinkboardBot", "https://t.me/Blinkboards"],
        logo: o + "/logo.png",
      },
      {
        "@type": "SoftwareApplication",
        name: "Blinkboard",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Telegram, Web",
        url: o,
        offers: { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: "0.10", highPrice: "3.99" },
      },
    ],
  };
}

export { escapeHtml, escapeAttr, listPlans, planOverrides };
