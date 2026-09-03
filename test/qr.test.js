import test from "node:test";
import assert from "node:assert/strict";
import { qrSvg } from "../src/qr.js";

test("qr svg contains svg markup", () => {
  const s = qrSvg("https://blinkboard.pages.dev/a/A2B3");
  assert.ok(s.includes("<svg"));
  assert.ok(s.includes("</svg>"));
  assert.ok(!s.includes("<script"));
});
