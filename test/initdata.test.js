import test from "node:test";
import assert from "node:assert/strict";
import { verifyInitData, clientIp } from "../src/initdata.js";

test("empty or junk initData is rejected", async () => {
  assert.equal(await verifyInitData("123:AAA", ""), null);
  assert.equal(await verifyInitData("123:AAA", "user=%7B%22id%22%3A1%7D"), null);
  assert.equal(await verifyInitData("", "hash=ab"), null);
});

test("clientIp prefers CF-Connecting-IP", () => {
  const ip = clientIp({
    headers: {
      get(name) {
        if (name === "CF-Connecting-IP") return "203.0.113.9";
        if (name === "X-Forwarded-For") return "10.0.0.1, 10.0.0.2";
        return null;
      },
    },
  });
  assert.equal(ip, "203.0.113.9");
});
