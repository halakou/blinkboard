export async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row ? String(row.value) : null;
}

export async function setSetting(db, key, value) {
  await db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, String(value)).run();
}

export async function getSession(db, userId) {
  const row = await db.prepare("SELECT state, data FROM sessions WHERE user_id = ?").bind(userId).first();
  if (!row) return { state: "idle", data: {} };
  let data = {};
  try { data = JSON.parse(row.data || "{}"); } catch { data = {}; }
  return { state: row.state || "idle", data };
}

export async function putSession(db, userId, state, data) {
  const now = Date.now();
  await db.prepare(
    "INSERT INTO sessions (user_id, state, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = excluded.updated_at"
  ).bind(userId, state, JSON.stringify(data || {}), now).run();
}

export async function clearSession(db, userId) {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export async function hitRate(db, key, windowStart, limit) {
  const row = await db.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").bind(key).first();
  if (!row || Number(row.window_start) !== windowStart) {
    await db.prepare(
      "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1"
    ).bind(key, windowStart).run();
    return { ok: true, count: 1 };
  }
  const count = Number(row.count) || 0;
  if (count >= limit) return { ok: false, count };
  await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
  return { ok: true, count: count + 1 };
}

export async function insertPage(db, page) {
  await db.prepare(
    `INSERT INTO pages (code, owner_id, kind, title, body, cta_url, image_key, plan_id, stars, eur_cents, status, created_at, invoice_payload, theme)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    page.code, page.owner_id, page.kind, page.title, page.body, page.cta_url, page.image_key,
    page.plan_id, page.stars, page.eur_cents, page.status, page.created_at, page.invoice_payload,
    page.theme || "classic"
  ).run();
}

export async function getPage(db, code) {
  return db.prepare("SELECT * FROM pages WHERE code = ?").bind(code).first();
}

export async function updatePage(db, code, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const sql = `UPDATE pages SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE code = ?`;
  await db.prepare(sql).bind(...keys.map((k) => fields[k]), code).run();
}

export async function insertPayment(db, row) {
  await db.prepare(
    `INSERT INTO payments (payload, user_id, code, stars, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(row.payload, row.user_id, row.code, row.stars, row.status, row.created_at).run();
}

export async function getPayment(db, payload) {
  return db.prepare("SELECT * FROM payments WHERE payload = ?").bind(payload).first();
}

export async function markPaid(db, payload, chargeId, paidAt) {
  await db.prepare(
    "UPDATE payments SET status = 'paid', charge_id = ?, paid_at = ? WHERE payload = ? AND status = 'pending'"
  ).bind(chargeId, paidAt, payload).run();
}

export async function listLiveDue(db, now) {
  const res = await db.prepare(
    "SELECT code, channel_msg_id FROM pages WHERE status = 'live' AND expires_at IS NOT NULL AND expires_at <= ?"
  ).bind(now).all();
  return (res && res.results) || [];
}

export async function listLivePublic(db, limit = 40) {
  const cap = Math.min(Math.max(Number(limit) || 40, 1), 50);
  const res = await db.prepare(
    `SELECT code, kind, title, expires_at, views
     FROM pages
     WHERE status = 'live' AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY paid_at DESC
     LIMIT ?`
  ).bind(Date.now(), cap).all();
  return (res && res.results) || [];
}

export async function listLiveAdmin(db, limit = 40) {
  const cap = Math.min(Math.max(Number(limit) || 40, 1), 80);
  const res = await db.prepare(
    `SELECT code, kind, title, status, expires_at, views, stars, owner_id, channel_msg_id
     FROM pages
     WHERE status = 'live'
     ORDER BY paid_at DESC
     LIMIT ?`
  ).bind(cap).all();
  return (res && res.results) || [];
}

export async function expireDue(db, now) {
  const res = await db.prepare(
    "UPDATE pages SET status = 'expired' WHERE status = 'live' AND expires_at IS NOT NULL AND expires_at <= ?"
  ).bind(now).run();
  return res?.meta?.changes || 0;
}

export async function listExpiredMedia(db, now, limit = 40) {
  return db.prepare(
    "SELECT code, image_key FROM pages WHERE status = 'expired' AND image_key IS NOT NULL LIMIT ?"
  ).bind(limit).all();
}

export async function bumpViews(db, code) {
  await db.prepare("UPDATE pages SET views = views + 1 WHERE code = ? AND status = 'live'").bind(code).run();
}

export async function stats(db) {
  const row = await db.prepare(
    `SELECT
      SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) AS live,
      SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
      SUM(CASE WHEN status = 'pending_pay' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'live' THEN views ELSE 0 END) AS views,
      SUM(CASE WHEN status IN ('live','expired') THEN stars ELSE 0 END) AS stars
     FROM pages`
  ).first();
  return row || {};
}

export async function adminLog(db, adminId, action, code, detail) {
  await db.prepare(
    "INSERT INTO admin_log (at, admin_id, action, code, detail) VALUES (?, ?, ?, ?, ?)"
  ).bind(Date.now(), adminId, action, code || null, detail || null).run();
}
