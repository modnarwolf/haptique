import { PRODUCT_TYPES, productPrice } from "../src/data/product-catalog.js";
import { findStripePrice } from "./stripe-catalog.mjs";

const MAX_LINES = 20;
const MAX_QUANTITY = 10;

export class CheckoutValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CheckoutValidationError";
    this.status = 400;
  }
}

export function validateCheckoutItems(items, { stripeCatalog, printifyTotePersonalizationProductId } = {}) {
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
      throw new CheckoutValidationError("A valid Haptique recipe is required");
    }

    const seed = Number(item.seed);
    if (!Number.isInteger(seed) || seed < 0 || seed > 999999) {
      throw new CheckoutValidationError("A valid Haptique design is required");
    }

    const printifyVariantId = product.printify.variantIds[size];
    if (!printifyVariantId) {
      throw new CheckoutValidationError(`Printify variant is not configured for ${product.name}`);
    }

    let personalization = null;
    if (product.id === "tote") {
      const printifyProductId = String(item.printifyProductId ?? "").trim();
      const printifyUploadId = String(item.printifyUploadId ?? "").trim();
      const fulfillmentStrategy = String(item.printifyFulfillmentStrategy ?? "personalization").trim();
      const strategy = String(item.personalizationStrategy ?? "").trim();
      const instructions = String(item.personalizationInstructions ?? "").trim();
      if (!printifyProductId || !printifyUploadId) {
        throw new CheckoutValidationError("The tote needs an approved Printify product preview");
      }
      if (fulfillmentStrategy !== "custom_product") {
        if (strategy !== "pstudio_pre_order_headless" || !/^[0-9a-f-]{36}$/i.test(instructions)) {
          throw new CheckoutValidationError("The tote needs an approved Printify personalization preview");
        }
        if (
          printifyTotePersonalizationProductId
          && printifyProductId !== String(printifyTotePersonalizationProductId)
        ) {
          throw new CheckoutValidationError("The Printify tote preview is out of date");
        }
      }
      personalization = {
        printifyProductId: printifyProductId.slice(0, 100),
        printifyUploadId: printifyUploadId.slice(0, 100),
        printifyFulfillmentStrategy: fulfillmentStrategy === "custom_product"
          ? "custom_product"
          : "personalization",
        ...(fulfillmentStrategy === "custom_product" ? {} : {
          personalizationStrategy: strategy,
          personalizationInstructions: instructions,
        }),
      };
    }

    const unitAmount = Math.round(productPrice(product.id, size) * 100);
    const stripePrice = stripeCatalog ? findStripePrice(stripeCatalog, product.id, size) : null;
    if (stripePrice && stripePrice.unitAmount !== unitAmount) {
      throw new CheckoutValidationError(
        `Stripe price is out of date for ${product.name} ${size}; rerun product setup`,
      );
    }

    return {
      productId: product.id,
      size,
      name: `${product.name} — ${size}`,
      description: `${String(item.seriesName ?? item.seriesId ?? "Haptique").slice(0, 80)} / Custom pattern`,
      quantity,
      unitAmount,
      priceId: stripePrice?.priceId,
      stripeProductId: stripePrice?.productId,
      designHash,
      seed,
      printifyVariantId,
      ...personalization,
    };
  });
}

export async function createCheckoutForCart({
  items,
  checkoutId,
  origin,
  stripe,
  stripeCatalog,
  orderStore,
  shippingRateId,
  printifyTotePersonalizationProductId,
}) {
  const id = String(checkoutId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new CheckoutValidationError("A valid checkout ID is required");
  }

  const siteOrigin = new URL(origin);
  if (siteOrigin.protocol !== "https:" && siteOrigin.hostname !== "localhost") {
    throw new CheckoutValidationError("Checkout origin must use HTTPS");
  }

  const lineItems = validateCheckoutItems(items, {
    stripeCatalog,
    printifyTotePersonalizationProductId,
  });
  if (orderStore) {
    await orderStore.createPending({
      checkoutId: id,
      items: lineItems,
      amountTotal: lineItems.reduce(
        (total, item) => total + item.unitAmount * item.quantity,
        0,
      ),
    });
  }
  const successUrl = new URL("/", siteOrigin);
  successUrl.searchParams.set("checkout", "success");
  successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancelUrl = new URL("/", siteOrigin);
  cancelUrl.searchParams.set("checkout", "canceled");

  const session = await stripe.createCheckoutSession({
    lineItems,
    checkoutId: id,
    successUrl: successUrl.toString(),
    cancelUrl: cancelUrl.toString(),
    shippingRateId,
  });
  if (orderStore) await orderStore.attachStripeSession(id, session.id);
  return session;
}
