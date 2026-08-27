export const PRODUCT_TYPES = [
  {
    id: "poster",
    name: "Art poster",
    short: "Poster",
    description: "Museum-grade paper, matte finish.",
    sizes: ["12 × 16 in", "18 × 24 in", "24 × 36 in"],
    prices: [32, 46, 65],
    dpi: 300,
    printify: {
      blueprintId: 852,
      printProviderId: 73,
      variantIds: {
        "12 × 16 in": 100780,
        "18 × 24 in": 76784,
        "24 × 36 in": 76787,
      },
      printDimensions: {
        "12 × 16 in": { width: 3600, height: 4800 },
        "18 × 24 in": { width: 5400, height: 7200 },
        "24 × 36 in": { width: 7200, height: 10800 },
      },
    },
  },
  {
    id: "canvas",
    name: "Stretched canvas",
    short: "Canvas",
    description: "Gallery-wrapped, ready to hang.",
    sizes: ["12 × 16 in", "18 × 24 in", "24 × 32 in"],
    prices: [78, 112, 148],
    dpi: 300,
    printify: {
      blueprintId: 937,
      printProviderId: 99,
      variantIds: {
        "12 × 16 in": 82230,
        "18 × 24 in": 82232,
        "24 × 32 in": 82234,
      },
      printDimensions: {
        "12 × 16 in": { width: 3600, height: 4800 },
        "18 × 24 in": { width: 5400, height: 7200 },
        "24 × 32 in": { width: 7200, height: 9600 },
      },
    },
  },
  {
    id: "tote",
    name: "Everyday tote",
    short: "Tote",
    description: "All-over print, long cotton handles.",
    sizes: ["16 × 16 in"],
    prices: [38],
    dpi: 150,
    handleColors: ["Black", "Beige", "White", "Red", "Navy"],
    defaultHandleColor: "Black",
    printify: {
      blueprintId: 1389,
      printProviderId: 10,
      variantIds: {
        "16 × 16 in": 103600,
      },
      variantIdsByHandleColor: {
        Black: { "16 × 16 in": 103600 },
        Beige: { "16 × 16 in": 103609 },
        White: { "16 × 16 in": 103606 },
        Red: { "16 × 16 in": 103603 },
        Navy: { "16 × 16 in": 103612 },
      },
      printDimensions: {
        "16 × 16 in": { width: 2625, height: 5250 },
      },
    },
  },
  {
    id: "blanket",
    name: "Woven blanket",
    short: "Blanket",
    description: "Cotton yarn, soft fringe edge.",
    sizes: ["37 × 52 in", "50 × 60 in", "60 × 80 in"],
    prices: [124, 158, 196],
    dpi: 150,
    printify: {
      blueprintId: 1626,
      printProviderId: 99,
      variantIds: {
        "37 × 52 in": 112794,
        "50 × 60 in": 112795,
        "60 × 80 in": 112796,
      },
      printDimensions: {
        "37 × 52 in": { width: 4992, height: 3552 },
        "50 × 60 in": { width: 5760, height: 4800 },
        "60 × 80 in": { width: 7680, height: 5760 },
      },
    },
  },
];

export function productPrice(productId, size) {
  const product = PRODUCT_TYPES.find((item) => item.id === productId) ?? PRODUCT_TYPES[0];
  const index = Math.max(0, product.sizes.indexOf(size));
  return product.prices[index] ?? product.prices[0];
}

export function getProductVariantId(productId, size, { handleColor } = {}) {
  const product = PRODUCT_TYPES.find((item) => item.id === productId);
  if (!product || !product.sizes.includes(size)) return undefined;
  if (product.id !== "tote") return product.printify.variantIds[size];
  const color = product.handleColors.includes(handleColor)
    ? handleColor
    : product.defaultHandleColor;
  return product.printify.variantIdsByHandleColor[color]?.[size];
}

export function getProductFormat(productId, size) {
  const product = PRODUCT_TYPES.find((item) => item.id === productId) ?? PRODUCT_TYPES[0];
  const selectedSize = product.sizes.includes(size) ? size : product.sizes[0];
  const match = selectedSize.match(/([\d.]+)\s*[×x]\s*([\d.]+)/i);
  const widthIn = Number(match?.[1] ?? 12);
  const heightIn = Number(match?.[2] ?? 16);
  const isTote = product.id === "tote";
  const printDimensions = product.printify.printDimensions?.[selectedSize];
  const width = printDimensions?.width ?? Math.round(widthIn * product.dpi);
  const height = printDimensions?.height ?? Math.round(heightIn * product.dpi);
  const rotatesForPrint = product.id === "blanket";
  const artworkWidth = isTote ? 2400 : rotatesForPrint ? height : width;
  const artworkHeight = isTote ? 2280 : rotatesForPrint ? width : height;
  return {
    productId: product.id,
    size: selectedSize,
    widthIn,
    heightIn,
    width,
    height,
    dpi: product.dpi,
    aspectRatio: isTote ? 1 : artworkWidth / artworkHeight,
    artworkWidth,
    artworkHeight,
  };
}
