# Blinkboard architecture

```
Telegram user
    │  private chat only
    ▼
Telegram Bot API  ──webhook secret──►  Worker  blinkboard.halakou.workers.dev
                                           │
                                           ├─ D1  pages / sessions / payments / rate_limits
                                           ├─ cron */5m  expire live + unpaid drafts
                                           ├─ photos via Telegram getFile (R2 optional)
                                           └─ Assets  public/

Public visitor
    │
    ▼
Pages  blinkboard.pages.dev  (proxy, host has no "halakou")
    │  strips hop-by-hop + cf-connecting-ip
    ▼
Worker
    GET /              landing
    GET /a/XXXX        escaped board (410 on expiry)
    GET /q/XXXX.svg    QR of the public URL
    GET /m/XXXX        live image (Telegram file_id or R2)
    GET /go            302 → t.me/<bot>?start=new
    POST /webhook      Telegram updates
```

## Page lifecycle

`draft in session` → `pages.status = pending_pay` + Stars invoice → `live` + `expires_at` → `expired` (cron or on-read) or `blocked` (admin).

Unpaid `pending_pay` rows older than 2 hours are expired by cron.

## Pricing

`src/pricing.js` is the source of truth. Worker vars `EUR_USD` and `STAR_USD` can retune Stars without a schema change. Adding a duration is a new row in `DEFAULT_PLANS`.

## Moderation

`src/moderate.js` runs before insert. Fail closed. No HTML templates from users. v1 has no ML image scan; photos are type/size-checked and stored only from Telegram.

## Trust boundaries

- Telegram `user.id` from the webhook body is used only after the secret-token header matches.
- User URLs are never fetched by the Worker.
- Board HTML is built with `escapeHtml` / `escapeAttr`.
- Webhook URL stays on workers.dev so Pages cannot drop the secret header.

## Analytics

Integer `views` on live GET `/a/XXXX` only. No raw IP storage.

## What v1 is not

- No custom HTML
- No Mini App checkout (invoice is in the bot chat)
- No TON / cards
- No custom domain until a zone exists
