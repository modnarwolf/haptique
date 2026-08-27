import { resolve } from "node:path";

import {
  PRODUCT_TYPES,
  getProductFormat,
  getProductVariantId,
  productPrice,
} from "../src/data/product-catalog.js";
import { createCheckoutForCart, CheckoutValidationError } from "./checkout-service.mjs";
import { createJsonOrderStore, OrderStoreError } from "./order-store.mjs";
import { loadPrintifyCatalog, PrintifyCatalogError } from "./printify-catalog.mjs";
import { createPrintifyClient, PrintifyApiError } from "./printify-client.mjs";
import {
  finalizePersonalization,
  productMockups,
  PrintifyPersonalizationError,
  startProductPreview,
} from "./printify-personalization.mjs";
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
    PrintifyPersonalizationError,
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
  printifyTotePersonalizationProductId,
  printifyFulfillmentMode = "disabled",
  printifyOrderApprovalConfirmed = false,
}) {
  const catalogPath = resolve(stripeProductsFile);
  const orderStore = createJsonOrderStore(resolve(orderStoreFile));
  const printifyCatalogPath = resolve(printifyProductsFile);
  const previewSessions = new Map();

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
      server.middlewares.use("/api/printify/product-preview/status", async (request, response) => {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }
        try {
          const query = new URL(request.url, "http://localhost").searchParams;
          const taskId = query.get("task_id");
          const session = previewSessions.get(taskId);
          if (!taskId || !session) {
            throw new PrintifyPersonalizationError("A valid Printify preview task is required");
          }
          const printify = createPrintifyClient({ token: printifyApiToken, shopId: printifyShopId });
          if (session.previewMode === "custom_product") {
            const product = await printify.retrieveProduct(session.productId);
            const mockups = productMockups(product, session.variantId);
            session.status = mockups.length ? "completed" : "processing";
            sendJson(response, 200, {
              task_id: taskId,
              status: session.status,
              preview_count: mockups.length,
              mockups,
            });
            return;
          }
          const task = await printify.retrievePersonalizationPreview(session.productId, taskId);
          session.status = task.status;
          sendJson(response, 200, task);
        } catch (error) {
          sendError(response, error);
        }
      });

      server.middlewares.use("/api/printify/product-preview/finalize", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }
        try {
          const body = await readJson(request);
          const session = previewSessions.get(String(body.taskId ?? ""));
          if (!session || session.status !== "completed") {
            throw new PrintifyPersonalizationError("A completed product preview is required");
          }
          if (session.previewMode === "custom_product") {
            sendJson(response, 200, { fulfillmentStrategy: "custom_product" });
            return;
          }
          const printify = createPrintifyClient({ token: printifyApiToken, shopId: printifyShopId });
          const personalization = await finalizePersonalization({ printify, ...session });
          sendJson(response, 200, personalization);
        } catch (error) {
          sendError(response, error);
        }
      });

      server.middlewares.use("/api/printify/product-preview", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }
        try {
          const productId = String(request.headers["x-haptique-product"] ?? "").trim();
          const size = String(request.headers["x-haptique-size"] ?? "").trim();
          const product = PRODUCT_TYPES.find((candidate) => candidate.id === productId);
          if (!product || !product.sizes.includes(size)) {
            throw new PrintifyPersonalizationError("Product preview is not available for this selection");
          }
          const requestedHandleColor = String(request.headers["x-haptique-handle-color"] ?? "").trim();
          if (
            product.id === "tote"
            && requestedHandleColor
            && !product.handleColors.includes(requestedHandleColor)
          ) {
            throw new PrintifyPersonalizationError("The selected tote handle color is not available");
          }
          const handleColor = product.id === "tote"
            ? (product.handleColors.includes(requestedHandleColor)
                ? requestedHandleColor
                : product.defaultHandleColor)
            : undefined;
          const variantId = getProductVariantId(product.id, size, { handleColor });
          const format = getProductFormat(product.id, size);
          if (!variantId) {
            throw new PrintifyPersonalizationError("A Printify variant is not configured for this selection");
          }
          if (!String(request.headers["content-type"] ?? "").startsWith("image/png")) {
            throw new PrintifyPersonalizationError("Product preview artwork must be sent as image/png");
          }
          const artwork = await readBody(request, 100_000_000);
          const fileName = String(request.headers["x-haptique-filename"] ?? `haptique-${product.id}.png`)
            .replace(/[^a-z0-9._-]/gi, "-")
            .slice(0, 120);
          const externalId = String(request.headers["x-haptique-preview-id"] ?? "").trim();
          const printify = createPrintifyClient({ token: printifyApiToken, shopId: printifyShopId });
          const preview = await startProductPreview({
            printify,
            configuredProductId: product.id === "tote" ? printifyTotePersonalizationProductId : undefined,
            artwork,
            fileName,
            blueprintId: product.printify.blueprintId,
            printProviderId: product.printify.printProviderId,
            variantId,
            retailPrice: Math.round(productPrice(product.id, size) * 100),
            expectedWidth: format.width,
            expectedHeight: format.height,
            productName: product.name,
            allowPersonalization: product.id === "tote",
            externalId: externalId || undefined,
          });
          preview.handleColor = handleColor;
          previewSessions.set(preview.taskId, {
            productId: preview.productId,
            variantId: preview.variantId,
            fieldId: preview.fieldId,
            uploadId: preview.uploadId,
            previewMode: preview.previewMode,
            status: preview.status,
          });
          sendJson(response, 202, preview);
        } catch (error) {
          sendError(response, error);
        }
      });

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
            printifyTotePersonalizationProductId,
          });
          sendJson(response, 200, { id: session.id, url: session.url });
        } catch (error) {
          sendError(response, error);
        }
      });
    },
  };
}
