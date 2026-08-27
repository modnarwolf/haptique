import test from "node:test";
import assert from "node:assert/strict";

import { validateCheckoutItems, CheckoutValidationError } from "../server/checkout-service.mjs";

const validItem = {
  productId: "poster",
  size: "12 × 16 in",
  quantity: 1,
  designHash: "hptq_test_design_hash",
  seed: 42,
  seriesName: "Loom",
  printifyProductId: "custom-poster",
  printifyUploadId: "upload-id",
  printifyFulfillmentStrategy: "custom_product",
};

test("checkout derives authoritative price and Printify variant server-side", () => {
  const [line] = validateCheckoutItems([{ ...validItem, price: 1 }]);

  assert.equal(line.unitAmount, 3200);
  assert.equal(line.printifyVariantId, 100780);
  assert.equal(line.quantity, 1);
});

test("checkout resolves the persisted Stripe Price for the exact product size", () => {
  const [line] = validateCheckoutItems([validItem], {
    stripeCatalog: {
      currency: "usd",
      prices: {
        "poster:12 × 16 in": {
          productId: "prod_poster",
          priceId: "price_poster",
          unitAmount: 3200,
        },
      },
    },
  });

  assert.equal(line.stripeProductId, "prod_poster");
  assert.equal(line.priceId, "price_poster");
});

test("checkout rejects a stale Stripe catalog price", () => {
  assert.throws(
    () => validateCheckoutItems([validItem], {
      stripeCatalog: {
        currency: "usd",
        prices: {
          "poster:12 × 16 in": {
            productId: "prod_poster",
            priceId: "price_poster",
            unitAmount: 1,
          },
        },
      },
    }),
    CheckoutValidationError,
  );
});

test("checkout rejects unknown sizes", () => {
  assert.throws(
    () => validateCheckoutItems([{ ...validItem, size: "99 × 99 in" }]),
    CheckoutValidationError,
  );
});

test("checkout rejects invalid quantities and missing design hashes", () => {
  assert.throws(() => validateCheckoutItems([{ ...validItem, quantity: 11 }]), CheckoutValidationError);
  assert.throws(() => validateCheckoutItems([{ ...validItem, designHash: "" }]), CheckoutValidationError);
});

test("tote checkout requires Printify personalization instructions from preview", () => {
  const {
    printifyProductId,
    printifyUploadId,
    printifyFulfillmentStrategy,
    ...unapprovedItem
  } = validItem;
  const tote = {
    ...unapprovedItem,
    productId: "tote",
    size: "16 × 16 in",
  };
  assert.throws(() => validateCheckoutItems([tote]), CheckoutValidationError);

  const [line] = validateCheckoutItems([{
    ...tote,
    printifyProductId: "personalized-tote",
    printifyUploadId: "upload-id",
    personalizationStrategy: "pstudio_pre_order_headless",
    personalizationInstructions: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  }], { printifyTotePersonalizationProductId: "personalized-tote" });
  assert.equal(line.printifyProductId, "personalized-tote");
  assert.equal(line.printifyVariantId, 103600);

  const [customProductLine] = validateCheckoutItems([{
    ...tote,
    printifyProductId: "custom-tote",
    printifyUploadId: "upload-id",
    printifyFulfillmentStrategy: "custom_product",
  }]);
  assert.equal(customProductLine.printifyFulfillmentStrategy, "custom_product");
  assert.equal(customProductLine.personalizationInstructions, undefined);
});

test("tote checkout resolves the selected handle color variant", () => {
  const [line] = validateCheckoutItems([{
    ...validItem,
    productId: "tote",
    productName: "Everyday tote",
    size: "16 × 16 in",
    handleColor: "Red",
    printifyProductId: "custom-red-tote",
  }]);
  assert.equal(line.handleColor, "Red");
  assert.equal(line.printifyVariantId, 103603);
  assert.throws(
    () => validateCheckoutItems([{ ...validItem, productId: "tote", size: "16 × 16 in", handleColor: "Green" }]),
    CheckoutValidationError,
  );
});
