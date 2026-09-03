# Blinkboard

Telegram-first rented pages. No site accounts. Landing + public boards on Cloudflare’s free tier.

Public URL: `https://blinkboard.pages.dev`  
Board URL: `https://blinkboard.pages.dev/a/XXXX`  
Bot: [@BlinkboardBot](https://t.me/BlinkboardBot)  
Live channel: [@Blinkboards](https://t.me/Blinkboards)  
Worker origin (webhook): `https://blinkboard.halakou.workers.dev`

## What it does

A visitor talks only to the Telegram bot or its Mini App (menu button).

1. Pick duration: 1h / 6h / 24h / 3d / 7d  
2. Pick type: promo, notice, or link  
3. Send headline, body, optional photo, optional `https` link  
4. Content is moderated  
5. Pay Telegram Stars  
6. Page goes live at `/a/XXXX` **and** on [@Blinkboards](https://t.me/Blinkboards) until expiry; then both are switched off  

The website is display-only. It does not take signups or payments.

## Payment (v1)

**Telegram Stars (`XTR`)** is the only processor.

| Option | Infra cost | Auto confirm | Telegram-native | Notes |
|---|---|---|---|---|
| Telegram Stars | ~€0 | `pre_checkout_query` + `successful_payment` | Yes | Chosen |
| Direct TON | wallet + chain watch | No, unless extra indexer | Partial | Ops cost, abuse surface |
| Stripe / cards | account + fees | Yes | No | Not Telegram-first |
| Third-party crypto bots | extra vendor | Maybe | Partial | Extra dependency |

Stars invoices use empty `provider_token`, currency `XTR`, `prices[].amount` = integer stars. Pages stay `pending_pay` until Telegram confirms. Amount is checked again in `pre_checkout_query` (must answer within 10s).

Euro list prices (configurable in `src/pricing.js` and D1 later):

- 1 hour €0.10  
- 6 hours €0.25  
- 24 hours €0.79  
- 3 days €1.99  
- 7 days €3.99  

Stars are derived from `EUR_USD` and `STAR_USD` (defaults 1.08 and 0.013). Change those vars; do not hard-code star counts in the bot.

## Stack (free Cloudflare)

- Worker: HTTP + cron (`*/5 * * * *`)  
- D1: pages, sessions, payments, rate limits, settings  
- Photos: Telegram `file_id` (R2 is not enabled on this account; API 10042). Optional later as `MEDIA`.  
- Assets: landing CSS/HTML  
- Pages: `blinkboard.pages.dev` reverse-proxy without `halakou` in the public host  
- No always-on VM  

## Bot commands

User: `/new` `/cancel` `/help` `/rules` · Mini App: menu button or `/start` → Open Mini App  
Admin: `/stats` `/expire CODE` `/block CODE reason`  

First `/start` becomes bootstrap admin if `ADMIN_IDS` is empty.

## Security

- Webhook requires `X-Telegram-Bot-Api-Secret-Token`  
- No user HTML; all text escaped  
- `https` links only; no IPs, localhost, userinfo, or URL shorteners  
- No server-side fetch of user URLs (SSRF)  
- Photos only from Telegram `getFile`  
- Rate limits per Telegram user id  
- Secrets via Wrangler, never in git  
- Admin can expire/block immediately  

## Local

```bash
npm test
npx wrangler d1 execute blinkboard --local --file=./schema.sql
npx wrangler dev
```

Copy `.env.example` to `.dev.vars`. Never commit tokens.

## Deploy

Needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment.

```bash
npx wrangler d1 create blinkboard
npx wrangler d1 execute blinkboard --remote --file=./schema.sql
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_IDS
npx wrangler deploy
npx wrangler pages deploy pages-alias --project-name blinkboard
```

Set webhook to the **workers.dev** origin, not Pages:

`https://blinkboard.halakou.workers.dev/webhook`

BotFather: `/newbot`, then paste the token into Wrangler (not into git). Set `BOT_USERNAME` in `[vars]`.

## Repo layout

```
src/           worker modules
public/        landing + board CSS/JS
pages-alias/   Pages proxy
schema.sql     D1
test/          node:test
```

See `ARCHITECTURE.md`.
