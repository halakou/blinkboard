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

const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "meta-externalagent",
  "cohere-ai",
  "YouBot",
];

export const FAQ_QA = [
  { q: "Do I need an account?", a: "No. Only Telegram." },
  { q: "How do I pay?", a: "Telegram Stars. The page stays unpublished until payment is confirmed." },
  { q: "Where does it appear?", a: "blinkboard.pages.dev/a/XXXX and the Telegram channel @Blinkboards." },
  { q: "Can other AIs use this?", a: "They can read /llms.txt, /api/live, and /openapi.json. Publishing still needs Stars in Telegram." },
  { q: "How do I report abuse?", a: "Open @BlinkboardBot and send /support." },
];

export function robotsTxt(publicSite) {
  if (!publicSite) {
    return "User-agent: *\nDisallow: /\n";
  }
  const ai = AI_BOTS.map((name) => `User-agent: ${name}\nAllow: /\n`).join("\n");
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /api/
Disallow: /webhook
Disallow: /internal
Disallow: /m/
Disallow: /q/

${ai}
Sitemap: ${publicSite}/sitemap.xml
`;
}

export function sitemapXml(origin) {
  const o = origin.replace(/\/$/, "");
  const lastmod = "2026-09-04";
  const paths = [
    ["/", "daily", "1.0"],
    ["/preview", "weekly", "0.8"],
    ["/how", "monthly", "0.7"],
    ["/pricing", "monthly", "0.7"],
    ["/faq", "monthly", "0.8"],
    ["/rules", "monthly", "0.5"],
    ["/terms", "monthly", "0.4"],
    ["/privacy", "monthly", "0.4"],
    ["/llms.txt", "weekly", "0.6"],
    ["/llms-full.txt", "weekly", "0.5"],
  ];
  const urls = paths
    .map(
      ([p, freq, pri]) =>
        `  <url>\n    <loc>${escapeHtml(o + p)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function aiTxt(origin) {
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  return `# Blinkboard AI policy
# Human/agent guide: ${o}/llms.txt

User-Agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /webhook
Disallow: /internal
Allow: /api/live
Allow: /api/plans
Allow: /llms.txt
Allow: /llms-full.txt
Allow: /openapi.json
Allow: /schema.json
Allow: /.well-known/agent-card.json
Disallow: /a/

Contact: ${o}/llms.txt
`;
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
- [llms.txt (well-known)](${o}/.well-known/llms.txt)
- [AI policy](${o}/ai.txt)
- [JSON-LD](${o}/schema.json)
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

function faqNode(o) {
  return {
    "@type": "FAQPage",
    "@id": o + "/faq#faq",
    url: o + "/faq",
    mainEntity: FAQ_QA.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function jsonLd(origin) {
  const o = origin.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": o + "#org",
        name: "Blinkboard",
        url: o,
        sameAs: ["https://t.me/BlinkboardBot", "https://t.me/Blinkboards"],
        logo: { "@type": "ImageObject", url: o + "/logo.png" },
      },
      {
        "@type": "WebSite",
        "@id": o + "#website",
        name: "Blinkboard",
        url: o,
        inLanguage: "en",
        publisher: { "@id": o + "#org" },
      },
      {
        "@type": "SoftwareApplication",
        "@id": o + "#app",
        name: "Blinkboard",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Telegram, Web",
        url: o,
        description: "Rent a temporary public page from Telegram. Pay Stars. Auto-expires.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "EUR",
          lowPrice: "0.10",
          highPrice: "3.99",
          url: o + "/pricing",
        },
        publisher: { "@id": o + "#org" },
      },
      faqNode(o),
    ],
  };
}

export function pageJsonLd(origin, { path = "/", title = "Blinkboard", description = "" } = {}) {
  const o = String(origin || "https://blinkboard.pages.dev").replace(/\/$/, "");
  const url = path === "/" ? o + "/" : o + path;
  const graph = jsonLd(o)["@graph"].filter((n) => n["@type"] !== "FAQPage" || path === "/faq");
  graph.push({
    "@type": "WebPage",
    "@id": url + "#webpage",
    url,
    name: title,
    description: description || undefined,
    isPartOf: { "@id": o + "#website" },
    about: { "@id": o + "#app" },
  });
  if (path !== "/") {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": url + "#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: o + "/" },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function jsonLdScript(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export { escapeHtml, escapeAttr, listPlans, planOverrides };
