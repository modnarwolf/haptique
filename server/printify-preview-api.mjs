import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  PRODUCT_TYPES,
  getProductFormat,
  getProductVariantId,
  productPrice,
} from "../src/data/product-catalog.js";
import { createPrintifyClient, PrintifyApiError } from "./printify-client.mjs";
import {
  finalizePersonalization,
  productMockups,
  PrintifyPersonalizationError,
  startProductPreview,
} from "./printify-personalization.mjs";

const SESSION_VERSION = 1;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ARTWORK_BYTES = 100_000_000;

function required(value, label, status = 503) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new PrintifyPersonalizationError(`${label} is not configured`, status);
  return normalized;
}

function signingKey(secret) {
  return createHash("sha256")
    .update(`haptique-printify-preview:${required(secret, "Printify preview")}`)
    .digest();
}

function signature(payload, secret) {
  return createHmac("sha256", signingKey(secret)).update(payload).digest("base64url");
}

export function createPreviewSessionToken(session, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    version: SESSION_VERSION,
    expiresAt: now + SESSION_TTL_MS,
    productId: String(session.productId ?? ""),
    variantId: Number(session.variantId),
    fieldId: session.fieldId ? String(session.fieldId) : undefined,
    uploadId: String(session.uploadId ?? ""),
    previewMode: String(session.previewMode ?? ""),
    remoteTaskId: session.remoteTaskId ? String(session.remoteTaskId) : undefined,
  })).toString("base64url");
  return `hps${SESSION_VERSION}.${payload}.${signature(payload, secret)}`;
}

export function readPreviewSessionToken(token, secret, now = Date.now()) {
  const [prefix, payload, receivedSignature, extra] = String(token ?? "").split(".");
  if (prefix !== `hps${SESSION_VERSION}` || !payload || !receivedSignature || extra) {
    throw new PrintifyPersonalizationError("A valid Printify preview task is required");
  }
  const expectedSignature = signature(payload, secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new PrintifyPersonalizationError("A valid Printify preview task is required");
  }

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new PrintifyPersonalizationError("A valid Printify preview task is required");
  }
  if (
    session?.version !== SESSION_VERSION
    || !session.productId
    || !Number.isInteger(session.variantId)
    || !session.uploadId
    || !["custom_product", "personalization"].includes(session.previewMode)
    || !Number.isFinite(session.expiresAt)
    || session.expiresAt <= now
    || (session.previewMode === "personalization" && (!session.fieldId || !session.remoteTaskId))
  ) {
    throw new PrintifyPersonalizationError(
      session?.expiresAt <= now
        ? "This Printify preview has expired; return to Studio and preview it again"
        : "A valid Printify preview task is required",
    );
  }
  return session;
}

function header(headers, name) {
  if (typeof headers?.get === "function") return String(headers.get(name) ?? "").trim();
  return String(headers?.[name.toLowerCase()] ?? headers?.[name] ?? "").trim();
}

function decodedHeader(headers, name) {
  const value = header(headers, name);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function selectionFromHeaders(headers) {
  const productId = header(headers, "x-haptique-product");
  const size = decodedHeader(headers, "x-haptique-size");
  const product = PRODUCT_TYPES.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new PrintifyPersonalizationError("Product preview is not available for this product type");
  }
  if (!product.sizes.includes(size)) {
    throw new PrintifyPersonalizationError("Product preview is not available for this product size");
  }

  const requestedHandleColor = header(headers, "x-haptique-handle-color");
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
  if (!variantId) {
    throw new PrintifyPersonalizationError("A Printify variant is not configured for this selection");
  }
  return { product, size, handleColor, variantId, format: getProductFormat(product.id, size) };
}

function runtime(env, fetchImpl = globalThis.fetch) {
  const token = required(env.PRINTIFY_API_TOKEN, "Printify API token");
  const shopId = required(env.PRINTIFY_SHOP_ID, "Printify shop ID");
  return {
    printify: createPrintifyClient({ token, shopId, fetchImpl }),
    sessionSecret: token,
    configuredToteProductId: env.PRINTIFY_TOTE_PERSONALIZATION_PRODUCT_ID,
  };
}

export async function startHostedProductPreview({
  headers,
  artwork,
  env = process.env,
  fetchImpl = globalThis.fetch,
}) {
  const contentType = header(headers, "content-type");
  if (!contentType.startsWith("image/png") && !contentType.startsWith("application/octet-stream")) {
    throw new PrintifyPersonalizationError("Product preview artwork must be sent as a PNG image");
  }
  if (!Buffer.isBuffer(artwork) || artwork.length === 0 || artwork.length > MAX_ARTWORK_BYTES) {
    throw new PrintifyPersonalizationError("Product preview artwork is empty or too large", 413);
  }

  const { product, size, handleColor, variantId, format } = selectionFromHeaders(headers);
  const designHash = header(headers, "x-haptique-design-hash");
  if (!designHash || designHash.length > 500) {
    throw new PrintifyPersonalizationError("A valid Haptique design hash is required");
  }
  const fileName = (header(headers, "x-haptique-filename") || `haptique-${product.id}.png`)
    .replace(/[^a-z0-9._-]/gi, "-")
    .slice(0, 120);
  const externalId = header(headers, "x-haptique-preview-id") || undefined;
  const { printify, sessionSecret, configuredToteProductId } = runtime(env, fetchImpl);
  const preview = await startProductPreview({
    printify,
    configuredProductId: product.id === "tote" ? configuredToteProductId : undefined,
    artwork,
    fileName,
    blueprintId: product.printify.blueprintId,
    printProviderId: product.printify.printProviderId,
    variantId,
    retailPrice: Math.round(productPrice(product.id, size) * 100),
    expectedWidth: format.width,
    expectedHeight: format.height,
    productName: product.name,
    productId: product.id,
    designHash,
    allowPersonalization: product.id === "tote",
    externalId,
  });
  const taskId = createPreviewSessionToken({
    productId: preview.productId,
    variantId: preview.variantId,
    fieldId: preview.fieldId,
    uploadId: preview.uploadId,
    previewMode: preview.previewMode,
    remoteTaskId: preview.previewMode === "personalization" ? preview.taskId : undefined,
  }, sessionSecret);
  return { ...preview, taskId, handleColor };
}

export async function getHostedProductPreviewStatus(
  taskId,
  env = process.env,
  fetchImpl = globalThis.fetch,
) {
  const { printify, sessionSecret } = runtime(env, fetchImpl);
  const session = readPreviewSessionToken(taskId, sessionSecret);
  if (session.previewMode === "custom_product") {
    const product = await printify.retrieveProduct(session.productId);
    const mockups = productMockups(product, session.variantId);
    return {
      task_id: taskId,
      status: mockups.length ? "completed" : "processing",
      preview_count: mockups.length,
      mockups,
    };
  }
  const task = await printify.retrievePersonalizationPreview(
    session.productId,
    session.remoteTaskId,
  );
  return { ...task, task_id: taskId };
}

export async function finalizeHostedProductPreview(
  taskId,
  env = process.env,
  fetchImpl = globalThis.fetch,
) {
  const { printify, sessionSecret } = runtime(env, fetchImpl);
  const session = readPreviewSessionToken(taskId, sessionSecret);
  if (session.previewMode === "custom_product") {
    const product = await printify.retrieveProduct(session.productId);
    if (!productMockups(product, session.variantId).length) {
      throw new PrintifyPersonalizationError("A completed product preview is required");
    }
    return { fulfillmentStrategy: "custom_product" };
  }

  const task = await printify.retrievePersonalizationPreview(
    session.productId,
    session.remoteTaskId,
  );
  if (task.status !== "completed") {
    throw new PrintifyPersonalizationError("A completed product preview is required");
  }
  return finalizePersonalization({ printify, ...session });
}

export function hostedPreviewError(error) {
  const expected = error instanceof PrintifyApiError || error instanceof PrintifyPersonalizationError;
  return {
    status: Number(error?.status) || 500,
    payload: {
      error: expected ? error.message : "Printify product preview could not be processed",
    },
  };
}
