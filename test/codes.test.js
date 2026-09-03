import test from "node:test";
import assert from "node:assert/strict";
import { ALPHABET, codeFromBytes, normalizeCode, pagePath, randomCode } from "../src/codes.js";

test("codes are 4 chars from alphabet", () => {
  const c = codeFromBytes(Uint8Array.from([0, 1, 31, 32]));
  assert.equal(c.length, 4);
  for (const ch of c) assert.ok(ALPHABET.includes(ch));
  assert.equal(normalizeCode("ab1c"), null);
  assert.equal(normalizeCode("a2b3"), "A2B3");
  assert.equal(pagePath("a2b3"), "/a/A2B3");
  assert.equal(pagePath("!!!"), null);
  const r = randomCode();
  assert.equal(normalizeCode(r), r);
});
