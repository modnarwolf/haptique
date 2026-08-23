import { readFile } from "node:fs/promises";

export class StripeCatalogError extends Error {
  constructor(message) {
    super(message);
    this.name = "StripeCatalogError";
    this.status = 503;
  }
}

export function stripeCatalogKey(productId, size) {
  return `${productId}:${size}`;
}

export async function loadStripeCatalog(path) {
  let payload;
  try {
    payload = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new StripeCatalogError(
        "Stripe products are not configured. Run npm run setup:stripe-products first.",
      );
    }
    throw new StripeCatalogError(`Stripe product catalog could not be read: ${error.message}`);
  }

  if (payload?.currency !== "usd" || !payload.prices || typeof payload.prices !== "object") {
    throw new StripeCatalogError("Stripe product catalog is invalid");
  }
  return payload;
}

export function findStripePrice(catalog, productId, size) {
  const entry = catalog.prices[stripeCatalogKey(productId, size)];
  if (!entry?.priceId?.startsWith("price_") || !entry?.productId?.startsWith("prod_")) {
    throw new StripeCatalogError(`Stripe price is not configured for ${productId} ${size}`);
  }
  return entry;
}
