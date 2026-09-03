import test from "node:test";
import assert from "node:assert/strict";
import { eurCentsToStars, getPlan, listPlans, formatEur, msFromHours, DEFAULT_PLANS } from "../src/pricing.js";

test("five default durations and euro cents", () => {
  const plans = listPlans();
  assert.equal(plans.length, 5);
  assert.deepEqual(
    plans.map((p) => [p.id, p.hours, p.eurCents]),
    [
      ["1h", 1, 10],
      ["6h", 6, 25],
      ["24h", 24, 79],
      ["3d", 72, 199],
      ["7d", 168, 399],
    ]
  );
});

test("stars conversion is integer and configurable", () => {
  assert.equal(eurCentsToStars(10), 8);
  assert.equal(eurCentsToStars(25), 21);
  assert.equal(eurCentsToStars(79), 66);
  assert.equal(eurCentsToStars(199), 165);
  assert.equal(eurCentsToStars(399), 331);
  assert.equal(eurCentsToStars(10, 1, 0.01), 10);
  assert.equal(eurCentsToStars(0), null);
  assert.equal(eurCentsToStars(-1), null);
});

test("getPlan and overrides", () => {
  assert.equal(getPlan("nope"), null);
  assert.equal(getPlan("24h").stars, 66);
  const custom = getPlan("1h", { plans: [{ id: "1h", hours: 1, eurCents: 50, label: "x" }], starUsd: 0.013, eurUsd: 1.08 });
  assert.equal(custom.stars, 42);
  assert.equal(formatEur(79), "€0.79");
  assert.equal(msFromHours(1), 3600000);
  assert.ok(DEFAULT_PLANS.length === 5);
});
