import test from "node:test";
import assert from "node:assert/strict";
import { sniffImage, photoFileIdFromMessage } from "../src/telegram.js";

test("sniffImage accepts jpeg png webp only", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(sniffImage(jpeg).mime, "image/jpeg");
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(sniffImage(png).mime, "image/png");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(sniffImage(webp).mime, "image/webp");
  assert.equal(sniffImage(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])), null);
});

test("photoFileIdFromMessage uses last photo size", () => {
  assert.equal(photoFileIdFromMessage({ photo: [{ file_id: "small" }, { file_id: "big" }] }), "big");
  assert.equal(photoFileIdFromMessage({ document: { file_id: "doc1" } }), "doc1");
  assert.equal(photoFileIdFromMessage({}), "");
});
