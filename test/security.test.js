import test from "node:test";
import assert from "node:assert/strict";
import { allowRate, isAdmin, parseAdminIds, rateWindow, secretsEqual, telegramUserId } from "../src/security.js";

test("admin parse and membership", () => {
  assert.deepEqual(parseAdminIds("1, 2 3"), [1, 2, 3]);
  assert.equal(isAdmin(2, "1,2"), true);
  assert.equal(isAdmin(9, "1,2"), false);
  assert.equal(isAdmin(5, "", [5]), true);
});

test("rate window and allow", () => {
  assert.equal(rateWindow(10_000, 5_000), 10_000);
  assert.equal(rateWindow(12_000, 5_000), 10_000);
  assert.equal(allowRate({ count: 0, limit: 8 }), true);
  assert.equal(allowRate({ count: 8, limit: 8 }), false);
});

test("webhook secret compare and telegram id", async () => {
  assert.equal(await secretsEqual("abc", "abc"), true);
  assert.equal(await secretsEqual("abc", "abd"), false);
  assert.equal(await secretsEqual("abc", "ab"), false);
  assert.equal(telegramUserId({ message: { from: { id: 42 } } }), 42);
  assert.equal(telegramUserId({}), null);
});
