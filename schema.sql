CREATE TABLE IF NOT EXISTS pages (
  code TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_url TEXT,
  image_key TEXT,
  plan_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  eur_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  expires_at INTEGER,
  blocked_at INTEGER,
  block_reason TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  invoice_payload TEXT,
  channel_msg_id INTEGER,
  theme TEXT NOT NULL DEFAULT 'classic',
  private_page INTEGER NOT NULL DEFAULT 0,
  listed INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_pages_status_exp ON pages(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pages_owner ON pages(owner_id, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  payload TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  stars INTEGER NOT NULL,
  status TEXT NOT NULL,
  charge_id TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_pay_charge ON payments(charge_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  code TEXT NOT NULL,
  ip TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (code, ip)
);

CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  code TEXT,
  detail TEXT
);
