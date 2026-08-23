import test from "node:test";
import assert from "node:assert/strict";

import {
  createPrintifyMockOrderForPaidCheckout,
  PrintifyFulfillmentError,
} from "../server/printify-fulfillment.mjs";

const paidOrder = {
  checkoutId: "bca58875-d985-4e6e-a49c-a4ef07bbf47b",
  status: "paid",
  paymentStatus: "paid",
  customerDetails: { name: "Jane Customer", email: "jane@example.com", phone: "5551234567" },
  shippingDetails: {
    name: "Jane Customer",
    address: {
      country: "US",
      state: "CA",
      line1: "123 Test Street",
      line2: "",
      city: "Los Angeles",
      postal_code: "90001",
    },
  },
  items: [{
    productId: "poster",
    size: "12 × 16 in",
    quantity: 1,
    printifyVariantId: 100780,
  }],
};

const catalog = {
  products: {
    poster: {
      productId: "printify-poster",
      variants: { "12 × 16 in": 100780 },
    },
  },
};

test("mock fulfillment requires both paid state and confirmed manual approval", async () => {
  await assert.rejects(
    () => createPrintifyMockOrderForPaidCheckout({
    order: paidOrder,
    printify: { async listOrders() { return { data: [] }; } },
      catalog,
      fulfillmentMode: "mock_draft",
      approvalConfirmed: false,
    }),
    PrintifyFulfillmentError,
  );
});

test("paid mock fulfillment creates an on-hold order without customer shipping email", async () => {
  let submitted;
  const result = await createPrintifyMockOrderForPaidCheckout({
    order: paidOrder,
    printify: {
      async listOrders() {
        return { data: [] };
      },
      async createOrder(body, options) {
        submitted = { body, options };
        return { id: "printify-order", status: "on-hold" };
      },
    },
    catalog,
    fulfillmentMode: "mock_draft",
    approvalConfirmed: true,
  });

  assert.equal(result.id, "printify-order");
  assert.equal(submitted.options.approvalConfirmed, true);
  assert.equal(submitted.body.send_shipping_notification, false);
  assert.equal(submitted.body.line_items[0].product_id, "printify-poster");
  assert.equal(submitted.body.address_to.country, "US");
});

test("a retried paid webhook reuses the matching recent Printify order", async () => {
  let creates = 0;
  const result = await createPrintifyMockOrderForPaidCheckout({
    order: paidOrder,
    printify: {
      async listOrders() {
        return { data: [{ id: "existing-order", external_id: paidOrder.checkoutId, status: "on-hold" }] };
      },
      async createOrder() {
        creates += 1;
      },
    },
    catalog,
    fulfillmentMode: "mock_draft",
    approvalConfirmed: true,
  });

  assert.equal(result.id, "existing-order");
  assert.equal(result.reused, true);
  assert.equal(creates, 0);
});
