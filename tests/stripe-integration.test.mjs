import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createJsonOrderStore } from "../server/order-store.mjs";
import { createStripeClient } from "../server/stripe-client.mjs";
import { handleStripeEvent, verifyStripeWebhook } from "../server/stripe-webhook.mjs";

function response(payload) {
  return { ok: true, status: 200, async json() { return payload; } };
}

test("Stripe product setup creates a reusable default Price without pinning an API version", async () => {
  let request;
  const stripe = createStripeClient({
    secretKey: "rk_test_example",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ id: "prod_test", default_price: "price_test" });
    },
  });

  await stripe.createProductWithDefaultPrice({
    name: "Art poster — 12 × 16 in",
    description: "Museum-grade paper.",
    unitAmount: 3200,
    productMetadata: { haptique_product_id: "poster" },
    priceMetadata: { haptique_size: "12 × 16 in" },
    idempotencyKey: "haptique-product-test",
  });

  assert.equal(request.url, "https://api.stripe.com/v1/products");
  assert.equal(request.options.headers["Stripe-Version"], undefined);
  assert.equal(request.options.headers["Idempotency-Key"], "haptique-product-test");
  assert.equal(request.options.body.get("default_price_data[currency]"), "usd");
  assert.equal(request.options.body.get("default_price_data[unit_amount]"), "3200");
  assert.equal(request.options.body.get("metadata[haptique_product_id]"), "poster");
  assert.equal(request.options.body.get("default_price_data[metadata][haptique_size]"), "12 × 16 in");
});

test("additional sizes become Prices on the same Stripe Product", async () => {
  let request;
  const stripe = createStripeClient({
    secretKey: "rk_test_example",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ id: "price_large", product: "prod_poster" });
    },
  });

  await stripe.createPrice({
    productId: "prod_poster",
    unitAmount: 4600,
    nickname: "18 × 24 in",
    lookupKey: "haptique_poster_large",
    metadata: { haptique_product_id: "poster", haptique_size: "18 × 24 in" },
    idempotencyKey: "haptique-price-large",
  });

  assert.equal(request.url, "https://api.stripe.com/v1/prices");
  assert.equal(request.options.body.get("product"), "prod_poster");
  assert.equal(request.options.body.get("unit_amount"), "4600");
  assert.equal(request.options.body.get("nickname"), "18 × 24 in");
});

test("Checkout uses persisted Price IDs and keeps dynamic payment methods enabled", async () => {
  let request;
  const stripe = createStripeClient({
    secretKey: "sk_test_example",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ id: "cs_test_example", url: "https://checkout.stripe.com/test" });
    },
  });

  await stripe.createCheckoutSession({
    checkoutId: "bca58875-d985-4e6e-a49c-a4ef07bbf47b",
    successUrl: "https://haptique.test/?checkout=success",
    cancelUrl: "https://haptique.test/?checkout=canceled",
    lineItems: [{ priceId: "price_poster", quantity: 2 }],
  });

  assert.equal(request.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(request.options.body.get("mode"), "payment");
  assert.equal(request.options.body.get("managed_payments[enabled]"), "false");
  assert.equal(request.options.body.get("line_items[0][price]"), "price_poster");
  assert.equal(request.options.body.get("line_items[0][quantity]"), "2");
  assert.equal(request.options.body.has("line_items[0][price_data][unit_amount]"), false);
  assert.equal(request.options.body.has("payment_method_types[0]"), false);
});

test("signed checkout.session.completed events update an order idempotently", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "haptique-orders-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = createJsonOrderStore(join(directory, "orders.json"));
  const checkoutId = "bca58875-d985-4e6e-a49c-a4ef07bbf47b";
  await store.createPending({
    checkoutId,
    amountTotal: 3200,
    items: [{ priceId: "price_poster", quantity: 1 }],
  });
  await store.attachStripeSession(checkoutId, "cs_test_example");

  const event = {
    id: "evt_test_completed",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_example",
        client_reference_id: checkoutId,
        metadata: { haptique_checkout_id: checkoutId },
        payment_status: "paid",
        customer: "cus_test",
        payment_intent: "pi_test",
        amount_total: 3200,
        currency: "usd",
        customer_details: {
          name: "Jane Customer",
          email: "jane@example.com",
          phone: "5551234567",
        },
        collected_information: {
          shipping_details: {
            name: "Jane Customer",
            address: {
              country: "US",
              state: "CA",
              line1: "123 Test Street",
              line2: null,
              city: "Los Angeles",
              postal_code: "90001",
            },
          },
        },
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const timestamp = 1_800_000_000;
  const secret = "whsec_test_secret";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest("hex");
  const verified = verifyStripeWebhook(rawBody, `t=${timestamp},v1=${signature}`, secret, {
    now: timestamp * 1000,
  });

  let fulfillmentCalls = 0;
  const onPaid = async (order) => {
    fulfillmentCalls += 1;
    assert.equal(order.customerDetails.email, "jane@example.com");
    assert.equal(order.shippingDetails.address.country, "US");
    return { id: "printify_test_order", status: "on-hold" };
  };
  await handleStripeEvent(verified, store, { onPaid });
  await handleStripeEvent(verified, store, { onPaid });
  const order = await store.findByStripeSession("cs_test_example");
  assert.equal(order.status, "paid");
  assert.equal(order.paymentStatus, "paid");
  assert.deepEqual(order.processedStripeEvents, ["evt_test_completed"]);
  assert.equal(order.printifyOrderId, "printify_test_order");
  assert.equal(order.printifyStatus, "on-hold");
  assert.equal(fulfillmentCalls, 1);
});
