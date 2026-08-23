import { createHmac, timingSafeEqual } from "node:crypto";

export class StripeWebhookError extends Error {
  constructor(message) {
    super(message);
    this.name = "StripeWebhookError";
    this.status = 400;
  }
}

function parseSignatureHeader(header) {
  const values = new Map();
  for (const part of String(header ?? "").split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    values.set(key, [...(values.get(key) ?? []), value]);
  }
  return values;
}

export function verifyStripeWebhook(rawBody, signatureHeader, secret, {
  now = Date.now(),
  toleranceSeconds = 300,
} = {}) {
  const webhookSecret = String(secret ?? "").trim();
  if (!webhookSecret.startsWith("whsec_")) {
    throw new StripeWebhookError("Stripe webhook secret is not configured");
  }

  const values = parseSignatureHeader(signatureHeader);
  const timestamp = Number(values.get("t")?.[0]);
  const signatures = values.get("v1") ?? [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new StripeWebhookError("Stripe webhook signature is malformed");
  }
  if (Math.abs(Math.floor(now / 1000) - timestamp) > toleranceSeconds) {
    throw new StripeWebhookError("Stripe webhook signature has expired");
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.`)
    .update(body)
    .digest();
  const valid = signatures.some((candidate) => {
    if (!/^[0-9a-f]{64}$/i.test(candidate)) return false;
    return timingSafeEqual(expected, Buffer.from(candidate, "hex"));
  });
  if (!valid) throw new StripeWebhookError("Stripe webhook signature is invalid");

  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new StripeWebhookError("Stripe webhook payload is invalid");
  }
}

export async function handleStripeEvent(event, orderStore, { onPaid } = {}) {
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return { handled: false };
  }

  const session = event.data?.object;
  const checkoutId = session?.metadata?.haptique_checkout_id ?? session?.client_reference_id;
  if (!checkoutId || !session?.id) {
    throw new StripeWebhookError("Stripe Checkout Session is missing Haptique identifiers");
  }

  const order = await orderStore.completeCheckout({
    checkoutId,
    eventId: event.id,
    stripeSessionId: session.id,
    paymentStatus: session.payment_status,
    customerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
    amountTotal: session.amount_total,
    currency: session.currency,
    customerDetails: session.customer_details
      ? {
          name: session.customer_details.name,
          email: session.customer_details.email,
          phone: session.customer_details.phone,
        }
      : null,
    shippingDetails:
      session.collected_information?.shipping_details ?? session.shipping_details ?? null,
  });
  if (order.paymentStatus === "paid" && onPaid && !order.printifyOrderId) {
    const printifyOrder = await onPaid(order);
    const fulfilledOrder = await orderStore.attachPrintifyOrder(order.checkoutId, printifyOrder);
    return { handled: true, order: fulfilledOrder };
  }
  return { handled: true, order };
}
