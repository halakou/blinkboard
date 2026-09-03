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

export const SAMPLE_PAGES = Object.freeze({
  classic: Object.freeze({
    kind: "promo",
    title: "Sunday market breakfast",
    body: "Sourdough, slow eggs, and filter coffee from 8am. Bring cash. Tables turn in forty minutes — take the last one under the fig tree.",
    cta_url: "https://blinkboard.pages.dev/how",
  }),
  eightbit: Object.freeze({
    kind: "promo",
    title: "Neon Dumpling — tonight only",
    body: "Walk-in kitchen on 14th. Chili oil dumplings, cold beer, no reservations. Kitchen open until 1am. Tell them Blinkboard sent you.",
    cta_url: "https://blinkboard.pages.dev/how",
  }),
  midnight: Object.freeze({
    kind: "notice",
    title: "Roof bar after midnight",
    body: "Guest DJ until 3. Coats checked at the lift. No guest list after 12:30 — screenshot this board at the door.",
    cta_url: "https://blinkboard.pages.dev/how",
  }),
  poster: Object.freeze({
    kind: "promo",
    title: "ONE NIGHT ONLY",
    body: "Warehouse 4. Doors 9pm. Analog synths, no phones on the floor. Poster is the ticket — show this page.",
    cta_url: "https://blinkboard.pages.dev/how",
  }),
});

export const SAMPLE_PAGE = Object.freeze({
  code: "GAME",
  theme: "eightbit",
  ...SAMPLE_PAGES.eightbit,
});

export function samplePage(theme) {
  const t = normalizeTheme(theme);
  const s = SAMPLE_PAGES[t] || SAMPLE_PAGES.classic;
  return { code: "GAME", theme: t, ...s };
}
