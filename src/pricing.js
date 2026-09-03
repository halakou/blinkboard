/** Configurable rental plans. Amounts in euro cents; Stars derived at runtime. */

export const DEFAULT_EUR_USD = 1.08;
export const DEFAULT_STAR_USD = 0.013;
export const PRIVATE_STARS = 5;

export const DEFAULT_PLANS = Object.freeze([
  Object.freeze({ id: "1h", hours: 1, eurCents: 10, label: "1 hour" }),
  Object.freeze({ id: "6h", hours: 6, eurCents: 25, label: "6 hours" }),
  Object.freeze({ id: "24h", hours: 24, eurCents: 79, label: "24 hours" }),
  Object.freeze({ id: "3d", hours: 72, eurCents: 199, label: "3 days" }),
  Object.freeze({ id: "7d", hours: 168, eurCents: 399, label: "7 days" }),
]);

export function eurCentsToStars(eurCents, eurUsd = DEFAULT_EUR_USD, starUsd = DEFAULT_STAR_USD) {
  const cents = Number(eurCents);
  const fx = Number(eurUsd);
  const star = Number(starUsd);
  if (!Number.isFinite(cents) || cents < 1 || cents > 1_000_000) return null;
  if (!Number.isFinite(fx) || fx <= 0 || fx > 10) return null;
  if (!Number.isFinite(star) || star <= 0 || star > 10) return null;
  return Math.max(1, Math.round((cents / 100) * fx / star));
}

export function hydratePlan(plan, eurUsd = DEFAULT_EUR_USD, starUsd = DEFAULT_STAR_USD) {
  if (!plan || typeof plan.id !== "string") return null;
  const stars = eurCentsToStars(plan.eurCents, eurUsd, starUsd);
  if (!stars) return null;
  const hours = Number(plan.hours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 60) return null;
  return {
    id: plan.id,
    hours,
    eurCents: Number(plan.eurCents),
    label: String(plan.label || plan.id),
    stars,
  };
}

export function listPlans(overrides = {}) {
  const eurUsd = overrides.eurUsd ?? DEFAULT_EUR_USD;
  const starUsd = overrides.starUsd ?? DEFAULT_STAR_USD;
  const source = Array.isArray(overrides.plans) && overrides.plans.length ? overrides.plans : DEFAULT_PLANS;
  const out = [];
  for (const raw of source) {
    const p = hydratePlan(raw, eurUsd, starUsd);
    if (p) out.push(p);
  }
  return out;
}

export function getPlan(id, overrides = {}) {
  if (typeof id !== "string") return null;
  return listPlans(overrides).find((p) => p.id === id) || null;
}

export function formatEur(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return `€${(n / 100).toFixed(2)}`;
}

export function msFromHours(hours) {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 1) return null;
  return Math.round(h * 3600 * 1000);
}
