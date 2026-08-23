import { resolve } from "node:path";

import { createCheckoutForCart, CheckoutValidationError } from "./checkout-service.mjs";
import { createJsonOrderStore, OrderStoreError } from "./order-store.mjs";
import { loadPrintifyCatalog, PrintifyCatalogError } from "./printify-catalog.mjs";
import { createPrintifyClient, PrintifyApiError } from "./printify-client.mjs";
import {
  createPrintifyMockOrderForPaidCheckout,
  PrintifyFulfillmentError,
} from "./printify-fulfillment.mjs";
import { loadStripeCatalog, StripeCatalogError } from "./stripe-catalog.mjs";
import { createStripeClient, StripeApiError } from "./stripe-client.mjs";
import {
  handleStripeEvent,
  StripeWebhookError,
  verifyStripeWebhook,
} from "./stripe-webhook.mjs";

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json;charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readBody(request, maxBytes = 1_000_000) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new CheckoutValidationError("Request payload is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  try {
    return JSON.parse((await readBody(request)).toString("utf8"));
  } catch (error) {
    if (error instanceof CheckoutValidationError) throw error;
    throw new CheckoutValidationError("Checkout payload must be valid JSON");
  }
}

function sendError(response, error) {
  const expected = [
    CheckoutValidationError,
    StripeApiError,
    StripeCatalogError,
    StripeWebhookError,
    OrderStoreError,
    PrintifyApiError,
    PrintifyCatalogError,
    PrintifyFulfillmentError,
  ].some((ErrorType) => error instanceof ErrorType);
  sendJson(response, error.status ?? 500, {
    error: expected ? error.message : "Stripe request could not be processed",
  });
}

export function haptiqueCheckoutPlugin({
  stripeSecretKey,
  stripeWebhookSecret,
  stripeProductsFile = "server/data/stripe-products.json",
  orderStoreFile = ".data/orders.json",
  shippingRateId,
  publicSiteUrl,
  printifyApiToken,
  printifyShopId,
  printifyProductsFile = "server/data/printify-products.json",
  printifyFulfillmentMode = "disabled",
  printifyOrderApprovalConfirmed = false,
}) {
  const catalogPath = resolve(stripeProductsFile);
  const orderStore = createJsonOrderStore(resolve(orderStoreFile));
  const printifyCatalogPath = resolve(printifyProductsFile);

  const onPaid = printifyFulfillmentMode === "mock_draft"
    ? async (order) => {
        const printify = createPrintifyClient({ token: printifyApiToken, shopId: printifyShopId });
        const catalog = await loadPrintifyCatalog(printifyCatalogPath, printifyShopId);
        return createPrintifyMockOrderForPaidCheckout({
          order,
          printify,
          catalog,
          fulfillmentMode: printifyFulfillmentMode,
          approvalConfirmed: printifyOrderApprovalConfirmed,
        });
      }
    : undefined;

  return {
    name: "haptique-checkout-api",
    configureServer(server) {
      server.middlewares.use("/api/stripe/checkout/status", async (request, response) => {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }
        try {
          const sessionId = new URL(request.url, "http://localhost").searchParams.get("session_id");
          if (!sessionId?.startsWith("cs_test_")) {
            throw new CheckoutValidationError("A valid Stripe Checkout Session ID is required");
          }
          const order = await orderStore.findByStripeSession(sessionId);
          if (!order) {
            sendJson(response, 404, { error: "Checkout confirmation is not available yet" });
            return;
          }
          sendJson(response, 200, {
            status: order.status,
            paymentStatus: order.paymentStatus,
            fulfillmentStatus: order.printifyOrderId
              ? "printify_on_hold"
              : order.paymentStatus === "paid"
                ? "payment_confirmed"
                : "awaiting_payment_confirmation",
            order: {
              reference: order.checkoutId,
              amountSubtotal: order.amountTotal,
              currency: order.currency,
              createdAt: order.createdAt,
              items: order.items.map((item) => ({
                name: item.name,
                description: item.description,
                size: item.size,
                quantity: item.quantity,
                unitAmount: item.unitAmount,
              })),
            },
            testMode: true,
          });
        } catch (error) {
          sendError(response, error);
        }
      });

      server.middlewares.use("/api/stripe/webhook", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }
        try {
          const rawBody = await readBody(request);
          const event = verifyStripeWebhook(
            rawBody,
            request.headers["stripe-signature"],
            stripeWebhookSecret,
          );
          const result = await handleStripeEvent(event, orderStore, { onPaid });
          sendJson(response, 200, { received: true, handled: result.handled });
        } catch (error) {
          sendError(response, error);
        }
      });

      server.middlewares.use("/api/stripe/checkout", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const stripe = createStripeClient({ secretKey: stripeSecretKey });
          const stripeCatalog = await loadStripeCatalog(catalogPath);
          const body = await readJson(request);
          const session = await createCheckoutForCart({
            items: body.items,
            checkoutId: body.checkoutId,
            origin: publicSiteUrl || "http://localhost:5173",
            stripe,
            stripeCatalog,
            orderStore,
            shippingRateId,
          });
          sendJson(response, 200, { id: session.id, url: session.url });
        } catch (error) {
          sendError(response, error);
        }
      });
    },
  };
}
