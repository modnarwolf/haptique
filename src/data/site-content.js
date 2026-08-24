// Edit this file to change the site's public-facing copy, campaign imagery,
// links, and series slugs. Commerce configuration remains in product-catalog.js.

export const SITE_CONTENT = Object.freeze({
  brand: {
    name: "Haptique",
    logos: ["/logoA.svg", "/logoB.svg", "/logoC.svg"],
    tagline: ["CREATIVE SOFTWARE", "FOR REAL THINGS"],
  },
  navigation: [
    { page: "shop", label: "Shop" },
    { page: "studio", label: "Studio" },
    { page: "about", label: "About" },
  ],
  shop: {
    heroEyebrow: "HAPTIQUE / SERIES",
    heroTitle: ["One number.", "One pattern.", "A real thing."],
    heroSuffix: "Every piece begins in the browser, then gets made for you.",
    makeCta: "Make your own",
    seriesCta: "View the series",
    collectionEyebrow: "AVAILABLE NOW",
    collectionTitle: "Patterns with a physical life.",
    collectionBody: "Each recipe is deterministic: return to the same number and the same composition returns with it.",
    studioEyebrow: "THE PATTERN STUDIO / LIVE",
    studioTitle: ["Don’t just", "choose one.", "Find yours."],
    studioBody: (seriesName) => `Use ${seriesName} as your starting point, then change the recipe, palette, and structure. The Studio remembers every coordinate.`,
    studioCta: (seriesName) => `Open ${seriesName} in Studio`,
    processEyebrow: "HOW HAPTIQUE WORKS / THREE MOVES",
    processTitle: ["From an idea", "to an object."],
    process: [
      { title: "Choose a series", body: "Start with a visual system and its own set of rules." },
      { title: "Discover art you love", body: "Move through recipes, colors, and structures until one feels yours." },
      { title: "Make it real", body: "Carry the exact design from the browser onto a physical object." },
    ],
  },
  seriesPage: {
    introSuffix: "Every variation is recoverable from its recipe.",
    studioCta: "Open in Studio",
    productsEyebrow: "THE SERIES / FOUR OBJECTS",
    productsTitle: ["One system,", "different surfaces."],
    productPlaceholder: ["PRODUCT IMAGE", "COMING SOON"],
    nextEyebrow: "UP NEXT / SERIES",
    nextCta: "Explore in Studio",
  },
  studio: {
    eyebrow: "PATTERN STUDIO / LIVE",
    title: ["Find a pattern", "only you could find."],
    intro: "Every recipe is a coordinate in the series. Change the number, palette, or structure. The same inputs always lead back to the same work.",
    curatedEyebrow: "CURATED RECIPES",
    curatedTitle: "Recipes worth returning to.",
  },
  about: {
    eyebrow: "ABOUT / HAPTIQUE",
    title: ["Digital patterns", "want to be touched."],
    lede: "Haptique is a generative design studio and made-to-order shop. We build visual systems in code, give you the controls, then translate your chosen result into an object for everyday life.",
    manifesto: [
      "Each series is a small world with its own rules. A recipe is not a limited edition number or a random label—it is the precise combination that lets the artwork exist again.",
      "Making only after an order means fewer speculative objects and more personal ones. Posters, stretched canvases, totes, and woven blankets are our first material vocabulary.",
    ],
    clothEyebrow: "A SMALL EASTER EGG",
    clothTitle: ["Before the objects,", "there was the cloth."],
    clothCta: "Touch the original experiment",
  },
  footer: {
    tagline: ["Creative software", "for real things."],
    contactEmail: "hello@haptique.studio",
    socialLinks: [
      { label: "Instagram ↗", href: "https://www.instagram.com/haptique.studio/" },
      { label: "Are.na ↗", href: "https://www.are.na/haptique" },
    ],
    made: ["On demand in small runs.", "Designed in Los Angeles."],
    copyright: "HAPTIQUE © 2026",
    signoff: "RECIPE BY RECIPE / OBJECT BY OBJECT",
  },
});

export const CAMPAIGN_SERIES = Object.freeze([
  {
    id: "sr0040",
    slug: "loom",
    name: "Loom",
    number: "04",
    intro: "Ordered bands meet improvised weave structures.",
    accent: "#dc5b31",
    images: [
      "/model_mock_previews/loom_model_A.png",
      "/model_mock_previews/loom_model_B.png",
      "/model_mock_previews/loom_preview_A.png",
    ],
    productColors: ["#c88566", "#b9a58c", "#7e9185", "#aa785f"],
  },
  {
    id: "sr0070",
    slug: "moire",
    name: "Moiré",
    number: "07",
    intro: "Optical currents drawn from one repeatable number.",
    accent: "#e9e6dc",
    images: [
      "/model_mock_previews/moire_model_A.png",
      "/model_mock_previews/moire_model_B.png",
      "/model_mock_previews/moire_preview_A.png",
    ],
    productColors: ["#b8b6ad", "#d2cec3", "#8f9ba0", "#b5a59b"],
  },
  {
    id: "sr0020",
    slug: "swatch",
    name: "Swatch",
    number: "02",
    intro: "Tiny color relationships, arranged into a field.",
    accent: "#a871df",
    images: [
      "/model_mock_previews/swatch_model_A.png",
      "/model_mock_previews/swatch_model_B.png",
      "/model_mock_previews/swatch_preview_A.png",
    ],
    productColors: ["#c7b7d9", "#d5c5b6", "#9daea2", "#b6a7a2"],
  },
]);

// Every procedural series can have a readable Studio URL, including series
// that do not yet have a campaign/detail page.
export const STUDIO_SERIES_SLUGS = Object.freeze({
  sr0010: "block-grid",
  sr0020: "swatch",
  sr0030: "cut-ribbons",
  sr0040: "loom",
  sr0050: "strata",
  sr0060: "collage",
  sr0070: "moire",
});

export const CAMPAIGN_SERIES_BY_ID = Object.freeze(
  Object.fromEntries(CAMPAIGN_SERIES.map((series) => [series.id, series])),
);

export const CAMPAIGN_SERIES_BY_SLUG = Object.freeze(
  Object.fromEntries(CAMPAIGN_SERIES.map((series) => [series.slug, series])),
);

export const STUDIO_SERIES_BY_SLUG = Object.freeze(
  Object.fromEntries(Object.entries(STUDIO_SERIES_SLUGS).map(([id, slug]) => [slug, id])),
);

