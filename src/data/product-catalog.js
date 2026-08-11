export const PRODUCT_TYPES = [
  {
    id: "poster",
    name: "Art poster",
    short: "Poster",
    description: "Museum-grade paper, matte finish.",
    sizes: ["12 × 16 in", "18 × 24 in", "24 × 36 in"],
    prices: [32, 46, 64],
    dpi: 300,
    printify: { blueprintId: null, printProviderId: null },
  },
  {
    id: "canvas",
    name: "Stretched canvas",
    short: "Canvas",
    description: "Gallery-wrapped, ready to hang.",
    sizes: ["12 × 16 in", "18 × 24 in", "24 × 32 in"],
    prices: [78, 112, 148],
    dpi: 300,
    printify: { blueprintId: null, printProviderId: null },
  },
  {
    id: "tote",
    name: "Everyday tote",
    short: "Tote",
    description: "All-over print, long cotton handles.",
    sizes: ["16 × 16 in"],
    prices: [38],
    dpi: 300,
    printify: { blueprintId: null, printProviderId: null },
  },
  {
    id: "blanket",
    name: "Woven blanket",
    short: "Blanket",
    description: "Cotton yarn, soft fringe edge.",
    sizes: ["37 × 52 in", "50 × 60 in", "60 × 80 in"],
    prices: [124, 158, 196],
    dpi: 150,
    printify: { blueprintId: null, printProviderId: null },
  },
];

export const CAMPAIGN_SERIES = [
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
  },
];

export function productPrice(productId, size) {
  const product = PRODUCT_TYPES.find((item) => item.id === productId) ?? PRODUCT_TYPES[0];
  const index = Math.max(0, product.sizes.indexOf(size));
  return product.prices[index] ?? product.prices[0];
}

export function getProductFormat(productId, size) {
  const product = PRODUCT_TYPES.find((item) => item.id === productId) ?? PRODUCT_TYPES[0];
  const selectedSize = product.sizes.includes(size) ? size : product.sizes[0];
  const match = selectedSize.match(/([\d.]+)\s*[×x]\s*([\d.]+)/i);
  const widthIn = Number(match?.[1] ?? 12);
  const heightIn = Number(match?.[2] ?? 16);
  const width = Math.round(widthIn * product.dpi);
  const height = Math.round(heightIn * product.dpi);
  return {
    productId: product.id,
    size: selectedSize,
    widthIn,
    heightIn,
    width,
    height,
    dpi: product.dpi,
    aspectRatio: widthIn / heightIn,
  };
}

export const SERIES_PLACEHOLDER_COLORS = Object.freeze({
  sr0020: ["#c7b7d9", "#d5c5b6", "#9daea2", "#b6a7a2"],
  sr0040: ["#c88566", "#b9a58c", "#7e9185", "#aa785f"],
  sr0070: ["#b8b6ad", "#d2cec3", "#8f9ba0", "#b5a59b"],
});
