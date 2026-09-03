import { renderSVG } from "uqr";

export function qrSvg(text, { size = 192 } = {}) {
  return renderSVG(String(text), { ecc: "M", border: 2, pixelSize: 1 }).replace(
    /width="[^"]+" height="[^"]+"/,
    `width="${size}" height="${size}"`
  );
}
