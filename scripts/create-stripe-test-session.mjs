import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { createCheckoutForCart } from "../server/checkout-service.mjs";
import { createJsonOrderStore } from "../server/order-store.mjs";
import { loadStripeCatalog } from "../server/stripe-catalog.mjs";
import { createStripeClient } from "../server/stripe-client.mjs";

const secretKey = process.env.STRIPE_SECRET_KEY;
const origin = process.env.PUBLIC_SITE_URL || "http://localhost:5173";

const stripe = createStripeClient({ secretKey });
const stripeCatalog = await loadStripeCatalog(
  process.env.STRIPE_PRODUCTS_FILE || "server/data/stripe-products.json",
);
const orderStore = createJsonOrderStore(
  resolve(process.env.ORDER_STORE_FILE || ".data/orders.json"),
);
const checkoutId = randomUUID();

const session = await createCheckoutForCart({
  stripe,
  stripeCatalog,
  orderStore,
  shippingRateId: process.env.STRIPE_SHIPPING_RATE_ID,
  origin,
  checkoutId,
  items: [
    {
      productId: "poster",
      size: "12 × 16 in",
      quantity: 1,
      designHash: "haptique-stripe-sandbox-smoke-test",
      seed: 42,
      seriesName: "Stripe sandbox smoke test",
    },
  ],
});

console.log(
  JSON.stringify(
    {
      testMode: true,
      checkoutId,
      sessionId: session.id,
      url: session.url,
    },
    null,
    2,
  ),
);
