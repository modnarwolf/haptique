const DEFAULT_STRIPE_API_URL = "https://api.stripe.com/v1";

export class StripeApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "StripeApiError";
    this.status = status;
    this.code = code;
  }
}

function required(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}

function appendMetadata(params, prefix, metadata = {}) {
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`${prefix}[${key}]`, String(value));
  }
}

export function createStripeClient({
  secretKey,
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_STRIPE_API_URL,
} = {}) {
  const key = required(secretKey, "Stripe API key");
  if (!/^(?:sk|rk)_test_/.test(key)) {
    throw new TypeError("Haptique sandbox checkout requires a Stripe test-mode API key");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");

  async function request(path, params, { idempotencyKey, method = "POST" } = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: method === "POST" ? params : undefined,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new StripeApiError(payload.error?.message ?? "Stripe request failed", {
        status: response.status,
        code: payload.error?.code,
      });
    }
    return payload;
  }

  return Object.freeze({
    retrieveAccount() {
      return request("/account", undefined, { method: "GET" });
    },

    async createProductWithDefaultPrice({
      name,
      description,
      currency = "usd",
      unitAmount,
      productMetadata,
      priceMetadata,
      idempotencyKey,
    }) {
      const params = new URLSearchParams({
        name: required(name, "Product name"),
        description: required(description, "Product description"),
        "default_price_data[currency]": required(currency, "Price currency").toLowerCase(),
        "default_price_data[unit_amount]": String(unitAmount),
      });
      appendMetadata(params, "metadata", productMetadata);
      appendMetadata(params, "default_price_data[metadata]", priceMetadata);
      return request("/products", params, { idempotencyKey });
    },

    async createPrice({
      productId,
      currency = "usd",
      unitAmount,
      nickname,
      lookupKey,
      metadata,
      idempotencyKey,
    }) {
      const params = new URLSearchParams({
        product: required(productId, "Stripe Product ID"),
        currency: required(currency, "Price currency").toLowerCase(),
        unit_amount: String(unitAmount),
        nickname: required(nickname, "Price nickname"),
        lookup_key: required(lookupKey, "Price lookup key"),
      });
      appendMetadata(params, "metadata", metadata);
      return request("/prices", params, { idempotencyKey });
    },

    async createCheckoutSession({
      lineItems,
      successUrl,
      cancelUrl,
      checkoutId,
      shippingRateId,
    }) {
      const params = new URLSearchParams({
        mode: "payment",
        "managed_payments[enabled]": "false",
        success_url: required(successUrl, "Checkout success URL"),
        cancel_url: required(cancelUrl, "Checkout cancel URL"),
        client_reference_id: required(checkoutId, "Checkout ID"),
        "shipping_address_collection[allowed_countries][0]": "US",
        "phone_number_collection[enabled]": "true",
        customer_creation: "always",
        "payment_intent_data[metadata][haptique_checkout_id]": checkoutId,
        "metadata[haptique_checkout_id]": checkoutId,
      });

      if (shippingRateId) {
        params.set("shipping_options[0][shipping_rate]", shippingRateId);
      }

      lineItems.forEach((item, index) => {
        const prefix = `line_items[${index}]`;
        params.set(`${prefix}[quantity]`, String(item.quantity));
        params.set(`${prefix}[price]`, required(item.priceId, "Stripe Price ID"));
      });

      return request("/checkout/sessions", params, { idempotencyKey: checkoutId });
    },
  });
}
