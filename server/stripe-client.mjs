const STRIPE_API_URL = "https://api.stripe.com/v1";

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

export function createStripeClient({ secretKey, fetchImpl = globalThis.fetch } = {}) {
  const key = required(secretKey, "Stripe secret key");
  if (!key.startsWith("sk_test_")) {
    throw new TypeError("Haptique sandbox checkout requires a Stripe test secret key");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");

  async function request(path, params, { idempotencyKey } = {}) {
    const response = await fetchImpl(`${STRIPE_API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: params,
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
    async createCheckoutSession({ lineItems, successUrl, cancelUrl, checkoutId }) {
      const params = new URLSearchParams({
        mode: "payment",
        success_url: required(successUrl, "Checkout success URL"),
        cancel_url: required(cancelUrl, "Checkout cancel URL"),
        "managed_payments[enabled]": "false",
        "shipping_address_collection[allowed_countries][0]": "US",
        "phone_number_collection[enabled]": "true",
        customer_creation: "always",
        "payment_intent_data[metadata][haptique_checkout_id]": checkoutId,
        "metadata[haptique_checkout_id]": checkoutId,
      });

      lineItems.forEach((item, index) => {
        const prefix = `line_items[${index}]`;
        params.set(`${prefix}[quantity]`, String(item.quantity));
        params.set(`${prefix}[price_data][currency]`, "usd");
        params.set(`${prefix}[price_data][unit_amount]`, String(item.unitAmount));
        params.set(`${prefix}[price_data][product_data][name]`, item.name);
        params.set(`${prefix}[price_data][product_data][description]`, item.description);
        params.set(
          `${prefix}[price_data][product_data][metadata][haptique_design_hash]`,
          item.designHash,
        );
        params.set(
          `${prefix}[price_data][product_data][metadata][printify_variant_id]`,
          String(item.printifyVariantId),
        );
      });

      return request("/checkout/sessions", params, { idempotencyKey: checkoutId });
    },
  });
}
