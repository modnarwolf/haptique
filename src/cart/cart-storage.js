export const CART_STORAGE_KEY = "haptique.cart.v1";
export const CART_STORAGE_VERSION = 1;

const PERSISTED_FIELDS = Object.freeze([
  "lineId",
  "seriesId",
  "seriesName",
  "seed",
  "designHash",
  "productId",
  "productName",
  "size",
  "price",
  "quantity",
  "aspectRatio",
  "printSpec",
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeCartItem(item) {
  if (
    !item
    || !isNonEmptyString(item.lineId)
    || !isNonEmptyString(item.seriesId)
    || !isNonEmptyString(item.seriesName)
    || !isNonEmptyString(item.designHash)
    || !isNonEmptyString(item.productId)
    || !isNonEmptyString(item.productName)
    || !isNonEmptyString(item.size)
  ) return null;

  const price = Number(item.price);
  const seed = Number(item.seed);
  const aspectRatio = Number(item.aspectRatio);
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(seed)) return null;

  return {
    lineId: item.lineId,
    seriesId: item.seriesId,
    seriesName: item.seriesName,
    seed: Math.max(0, Math.min(999999, Math.round(seed))),
    designHash: item.designHash,
    productId: item.productId,
    productName: item.productName,
    size: item.size,
    price,
    quantity: Math.max(1, Math.min(99, Math.round(Number(item.quantity) || 1))),
    aspectRatio: Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1,
    printSpec: item.printSpec && typeof item.printSpec === "object" ? { ...item.printSpec } : null,
  };
}

export function createStoredCart(items) {
  return {
    version: CART_STORAGE_VERSION,
    items: items.flatMap((item) => {
      const persisted = Object.fromEntries(
        PERSISTED_FIELDS.filter((field) => item[field] !== undefined).map((field) => [field, item[field]]),
      );
      const sanitized = sanitizeCartItem(persisted);
      return sanitized ? [sanitized] : [];
    }),
  };
}

export function loadStoredCart(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw);
    if (payload?.version !== CART_STORAGE_VERSION || !Array.isArray(payload.items)) return [];
    return payload.items.flatMap((item) => {
      const sanitized = sanitizeCartItem(item);
      return sanitized ? [sanitized] : [];
    });
  } catch {
    return [];
  }
}

export function storeCart(items, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(createStoredCart(items)));
    return true;
  } catch {
    // The live cart remains usable if storage is disabled or full.
    return false;
  }
}

