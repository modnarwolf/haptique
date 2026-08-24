import assert from "node:assert/strict";
import test from "node:test";

import {
  CART_STORAGE_KEY,
  createStoredCart,
  loadStoredCart,
  storeCart,
} from "../src/cart/cart-storage.js";

const item = {
  lineId: "line-1",
  seriesId: "sr0040",
  seriesName: "Loom",
  seed: 1042,
  designHash: "hq1_saved-recipe",
  productId: "poster",
  productName: "Art poster",
  size: "18 × 24 in",
  price: 46,
  quantity: 2,
  image: "data:image/png;base64,a-very-large-preview-that-should-not-be-stored",
  aspectRatio: 0.75,
  printSpec: { width: 5400, height: 7200, dpi: 300 },
};

function memoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem: (key) => key === CART_STORAGE_KEY ? value : null,
    setItem: (key, next) => { if (key === CART_STORAGE_KEY) value = next; },
    read: () => value,
  };
}

test("stores the recipe and product data without the large canvas image", () => {
  const payload = createStoredCart([item]);
  assert.equal(payload.version, 1);
  assert.equal(payload.items[0].designHash, item.designHash);
  assert.equal(payload.items[0].image, undefined);
});

test("restores cart items after a page round-trip", () => {
  const storage = memoryStorage();
  assert.equal(storeCart([item], storage), true);
  assert.deepEqual(loadStoredCart(storage), [createStoredCart([item]).items[0]]);
});

test("rejects malformed payloads and clamps unsafe quantities", () => {
  const stored = createStoredCart([{ ...item, quantity: 500 }]);
  const storage = memoryStorage(JSON.stringify(stored));
  assert.equal(loadStoredCart(storage)[0].quantity, 99);
  assert.deepEqual(loadStoredCart(memoryStorage("not-json")), []);
  assert.deepEqual(loadStoredCart(memoryStorage(JSON.stringify({ version: 99, items: [item] }))), []);
});

test("keeps the live cart usable when browser storage is unavailable", () => {
  const blockedStorage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  };
  assert.deepEqual(loadStoredCart(blockedStorage), []);
  assert.equal(storeCart([item], blockedStorage), false);
});

