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
};

test("checkout derives authoritative price and Printify variant server-side", () => {
  const [line] = validateCheckoutItems([{ ...validItem, price: 1 }]);

  assert.equal(line.unitAmount, 3200);
  assert.equal(line.printifyVariantId, 100780);
  assert.equal(line.quantity, 1);
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

