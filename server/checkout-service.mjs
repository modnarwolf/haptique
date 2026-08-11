import { PRODUCT_TYPES, productPrice } from "../src/data/product-catalog.js";

const MAX_LINES = 20;
const MAX_QUANTITY = 10;

export class CheckoutValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CheckoutValidationError";
    this.status = 400;
  }
}

export function validateCheckoutItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    throw new CheckoutValidationError(`Checkout requires 1–${MAX_LINES} line items`);
  }

  return items.map((item) => {
    const product = PRODUCT_TYPES.find((candidate) => candidate.id === item?.productId);
    if (!product) throw new CheckoutValidationError("Unknown product in cart");

    const size = String(item.size ?? "");
    if (!product.sizes.includes(size)) {
      throw new CheckoutValidationError(`Unavailable size for ${product.name}`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new CheckoutValidationError(`Quantity must be between 1 and ${MAX_QUANTITY}`);
    }

    const designHash = String(item.designHash ?? "").trim();
    if (!designHash || designHash.length > 500) {
      throw new CheckoutValidationError("A valid Haptique design hash is required");
    }

    const seed = Number(item.seed);
    if (!Number.isInteger(seed) || seed < 0 || seed > 999999) {
      throw new CheckoutValidationError("A valid Haptique seed is required");
    }

    const printifyVariantId = product.printify.variantIds[size];
    if (!printifyVariantId) {
      throw new CheckoutValidationError(`Printify variant is not configured for ${product.name}`);
    }

    return {
      name: `${product.name} — ${size}`,
      description: `${String(item.seriesName ?? item.seriesId ?? "Haptique").slice(0, 80)} / Seed ${String(seed).padStart(6, "0")}`,
      quantity,
      unitAmount: Math.round(productPrice(product.id, size) * 100),
      designHash,
      printifyVariantId,
    };
  });
}

export async function createCheckoutForCart({ items, checkoutId, origin, stripe }) {
  const id = String(checkoutId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new CheckoutValidationError("A valid checkout ID is required");
  }

  const siteOrigin = new URL(origin);
  if (siteOrigin.protocol !== "https:" && siteOrigin.hostname !== "localhost") {
    throw new CheckoutValidationError("Checkout origin must use HTTPS");
  }

  const lineItems = validateCheckoutItems(items);
  const successUrl = new URL("/", siteOrigin);
  successUrl.searchParams.set("checkout", "success");
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancelUrl = new URL("/", siteOrigin);
  cancelUrl.searchParams.set("checkout", "canceled");

  return stripe.createCheckoutSession({
    lineItems,
    checkoutId: id,
    successUrl: successUrl.toString(),
    cancelUrl: cancelUrl.toString(),
  });
}

