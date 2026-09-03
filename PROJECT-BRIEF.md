# Blinkboard — product brief for external review

This document describes **Blinkboard** as a product and system, for an independent review (architecture, UX, growth, professionalism). It contains **no secrets, tokens, keys, account IDs, or internal credentials**.

Please review as a product/engineering advisor: what to improve next, what is missing for a serious global launch, and which ideas are not worth doing on a free Cloudflare stack.

---

## One-line pitch

Blinkboard lets anyone **rent a temporary public web page from Telegram**, without creating a website account. They write a headline and text in a bot or Mini App, pick a visual template, **pay Telegram Stars**, and get a short URL. When the clock ends, the page (and its channel post) disappear.

---

## Public surfaces

| Surface | URL / handle | Role |
|---|---|---|
| Website | https://blinkboard.pages.dev | Landing, docs, public boards, Mini App host |
| Sample board | https://blinkboard.pages.dev/a/GAME | Live 8-bit example ad |
| Theme previews | `/preview/classic`, `/preview/eightbit`, `/preview/midnight`, `/preview/poster` | Try looks without paying |
| Bot | https://t.me/BlinkboardBot | Create, pay, admin, support |
| Channel | https://t.me/Blinkboards | Public feed of **paid live** pages until expiry |
| Mini App | Bot menu **Rent page**, or `/app` | Form + Stars invoice inside Telegram |
| Admin Mini App | `/admin` (admins only) | Expire / block / stats |

Webhook and API origin is a Cloudflare Worker in front of the same product. The **canonical public host** is `blinkboard.pages.dev` (no custom domain yet).

---

## Who it is for

Global, Telegram-first users who need a **short-lived public notice**: pop-up shop, event tonight, a link to share, a poster. Not a CMS. Not a full website builder. Not free HTML hosting.

Language: site English; bot English/Persian from Telegram `language_code`.

---

## Customer journey

1. Open @BlinkboardBot or the Mini App (no site signup).
2. Pick duration: 1 hour, 6 hours, 24 hours, 3 days, 7 days.
3. Pick page type: promo, notice, or link.
4. Pick a **look** (template): Classic, 8-bit, Midnight, Poster. Not free HTML — four CSS skins.
5. Send headline (max 80), body (max 600), optional https URL, optional photo **in chat only**.
6. Automated moderation (spam, phishing, malware language, scams, illegal terms, https-only links, no shorteners, no IPs/localhost).
7. Pay **Telegram Stars** (`XTR`). Page stays unpublished until Telegram confirms (`pre_checkout` + `successful_payment`).
8. Live at `https://blinkboard.pages.dev/a/XXXX` (4-character code). QR + countdown on the page. Also posted to @Blinkboards.
9. Cron every 5 minutes expires due pages and deletes the channel post. Admin can expire/block immediately.

List prices (euros, charged as Stars at runtime FX): **€0.10 / €0.25 / €0.79 / €1.99 / €3.99**. Stars are derived from configurable EUR→USD and USD→Star rates, not hard-coded in the bot.

---

## What we already built (v1 → current)

### Product

- Telegram-first rental pages; **no website accounts**.
- Landing (dark, GitHub-like density) + legal/how/pricing/FAQ pages.
- Four page templates (CSS only).
- Mini App: live theme preview, duration/type/look, character counts, Stars pay, list of the user’s live pages, sample link.
- Chat bot: same funnel including **photo** (Mini App has no photo upload yet).
- Public sample board + `/preview/{theme}`.
- Live channel as distribution: paid pages are announced; posts removed on expiry/block.

### Payments

- **Telegram Stars only** (empty `provider_token`, currency `XTR`).
- Chosen because processor cost is ~zero, native to Telegram, webhook-confirmable before publish.
- Not in v1: Stripe, cards, TON, crypto bots.

### Trust and safety

- No user HTML; all text escaped (XSS).
- Destination URLs never fetched by the server (no SSRF).
- https only; block shorteners, IPs, localhost, userinfo in URLs.
- Keyword/rules moderation before insert.
- Rate limits per Telegram user / IP.
- Webhook authenticated with Telegram secret-token header.
- Admin allowlist in the Worker; first `/start` was bootstrap, then locked.
- Admin: `/whoami` `/stats` `/live` `/expire CODE` `/block CODE` `/support`; HMAC Mini App `/admin`.
- No website password panel (Telegram identity is the control plane).

### Platform (free Cloudflare)

- Cloudflare Worker: HTTP + cron `*/5`.
- D1: pages, sessions, payments, rate limits, settings, admin log.
- Worker static assets for landing/Mini App.
- Cloudflare Pages as public reverse-proxy host (`*.pages.dev`) so the public URL has no personal Worker subdomain.
- Photos: Telegram `file_id` proxied at `/m/XXXX`. Object storage (R2) **not enabled** on this account.
- No always-on VM.

### Discovery / agents (read-only)

Intended so other AIs can **understand** Blinkboard, not publish unpaid pages:

- `/llms.txt`, `/llms-full.txt`
- `/openapi.json`
- `GET /api/plans`, `GET /api/live` (no owner IDs)
- `/.well-known/agent-card.json`
- `/feed.xml`
- robots/sitemap; `workers.dev` noindex
- Creating a page still requires Telegram + Stars.

### Ops

- GitHub repo for source.
- Weekly D1 export backup (local).
- Health: `GET /health`.

---

## Explicit non-goals (current)

- Free-form HTML/CSS/JS from customers.
- Site logins, email, Google login.
- Custom domain (no DNS zone yet).
- Image malware/CSAM ML scan (photos are type/size checked only).
- Refund desk beyond Telegram’s Stars rules.
- MCP server for third-party agents (docs/OpenAPI only).
- Recurring Stars subscriptions.

---

## Known product / UX gaps (honest)

- Mini App vs chat: photo only in chat; two surfaces to maintain.
- Channel posts every paid page (public by design); some users may not want distribution — no opt-out yet.
- URL alphabet omits 0/O/1/I (readability); sample code cannot use those letters.
- Global ranking/SEO is not guaranteed; content is still thin for Google.
- Telegram Mini App HMAC can fail if opened outside the bot; pay then falls back to chat.
- No custom domain, no email support, no status page, no image CDN.
- Abuse: keyword filters are not a full moderator; 8-bit/midnight/poster are skins, not a design studio.

---

## Questions for the reviewer

1. Is “rent a page from Telegram for an hour” a clear category, or does it need a sharper name/job-to-be-done?
2. What is the smallest professional next step: custom domain, opt-in channel, photo in Mini App, more templates, or something else?
3. Stars-only: good for Telegram-native, or a blocker for global non-Telegram traffic?
4. Should `/api/live` stay public, or is a live public catalog a spam/abuse magnet?
5. How would you price templates (free vs paid skins) without wrecking the simple Stars invoice?
6. What would you **not** build?

---

## How to try it

- Site: https://blinkboard.pages.dev  
- Sample: https://blinkboard.pages.dev/a/GAME  
- Bot: https://t.me/BlinkboardBot  
- Channel: https://t.me/Blinkboards  

Please cite concrete UX or architecture changes, not generic “add AI” advice.
