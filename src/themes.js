export const THEMES = Object.freeze([
  Object.freeze({ id: "classic", label: "Classic", fa: "کلاسیک" }),
  Object.freeze({ id: "eightbit", label: "8-bit", fa: "۸بیتی" }),
  Object.freeze({ id: "midnight", label: "Midnight", fa: "شب" }),
  Object.freeze({ id: "poster", label: "Poster", fa: "پوستر" }),
]);

export function normalizeTheme(raw) {
  const id = String(raw || "").toLowerCase().trim();
  return THEMES.some((t) => t.id === id) ? id : "classic";
}

export function themeHref(id) {
  return `/themes/${normalizeTheme(id)}.css`;
}

export const SAMPLE_PAGE = Object.freeze({
  code: "GAME",
  kind: "promo",
  title: "Neon Dumpling — tonight only",
  body: "Walk-in kitchen on 14th. Chili oil dumplings, cold beer, no reservations. Kitchen open until 1am. Tell them Blinkboard sent you.",
  cta_url: "https://blinkboard.pages.dev/how",
  theme: "eightbit",
});
