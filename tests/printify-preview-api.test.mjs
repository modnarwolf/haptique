import assert from "node:assert/strict";
import test from "node:test";

import {
  createPreviewSessionToken,
  finalizeHostedProductPreview,
  getHostedProductPreviewStatus,
  readPreviewSessionToken,
  startHostedProductPreview,
} from "../server/printify-preview-api.mjs";
import { PrintifyPersonalizationError } from "../server/printify-personalization.mjs";
import { POST as hostedPreviewRoute } from "../api/printify/product-preview.js";

function pngHeader(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const session = {
  productId: "product-1",
  variantId: 100780,
  uploadId: "upload-1",
  previewMode: "custom_product",
};

test("preview session tokens are signed, expiring, and self-contained", () => {
  const token = createPreviewSessionToken(session, "secret-token", 1_000);
  assert.deepEqual(readPreviewSessionToken(token, "secret-token", 2_000), {
    version: 1,
    expiresAt: 7_201_000,
    productId: "product-1",
    variantId: 100780,
    uploadId: "upload-1",
    previewMode: "custom_product",
  });
  assert.throws(
    () => readPreviewSessionToken(`${token}tampered`, "secret-token", 2_000),
    PrintifyPersonalizationError,
  );
  assert.throws(
    () => readPreviewSessionToken(token, "secret-token", 7_201_000),
    /expired/,
  );
});

test("the hosted preview route always returns JSON errors", async () => {
  const response = await hostedPreviewRoute(new Request("https://haptique.example/api/printify/product-preview", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: Buffer.from(""),
  }));
  assert.equal(response.status, 413);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match((await response.json()).error, /empty or too large/);
});

test("hosted preview works across stateless start, status, and finalize requests", async () => {
  const env = { PRINTIFY_API_TOKEN: "test-token", PRINTIFY_SHOP_ID: "22838500" };
  let product;
  const fetchImpl = async (url, options = {}) => {
    if (url.includes("/products.json?") && options.method !== "POST") {
      return jsonResponse({ data: product ? [product] : [], last_page: 1 });
    }
    if (url.endsWith("/uploads/images.json")) return jsonResponse({ id: "upload-hosted" });
    if (url.endsWith("/products.json") && options.method === "POST") {
      const body = JSON.parse(options.body);
      product = {
        ...body,
        id: "product-hosted",
        images: [{
          src: "https://mockups.example/hosted.jpg",
          variant_ids: [100780],
          position: "front",
        }],
      };
      return jsonResponse(product);
    }
    if (url.endsWith("/products/product-hosted.json")) return jsonResponse(product);
    throw new Error(`Unexpected Printify request: ${url}`);
  };
  const headers = new Headers({
    "content-type": "image/png",
    "x-haptique-product": "poster",
    "x-haptique-size": encodeURIComponent("12 × 16 in"),
    "x-haptique-design-hash": "hq1_hosted-recipe",
    "x-haptique-filename": "poster.png",
  });

  const preview = await startHostedProductPreview({
    headers,
    artwork: pngHeader(3600, 4800),
    env,
    fetchImpl,
  });
  assert.match(preview.taskId, /^hps1\./);
  assert.equal(preview.productId, "product-hosted");

  const status = await getHostedProductPreviewStatus(preview.taskId, env, fetchImpl);
  assert.equal(status.status, "completed");
  assert.equal(status.mockups[0].src, "https://mockups.example/hosted.jpg");

  const finalized = await finalizeHostedProductPreview(preview.taskId, env, fetchImpl);
  assert.deepEqual(finalized, { fulfillmentStrategy: "custom_product" });
});

test("hosted tote preview decodes the transport-safe multiplication sign", async () => {
  const env = { PRINTIFY_API_TOKEN: "test-token", PRINTIFY_SHOP_ID: "22838500" };
  const fetchImpl = async (url, options = {}) => {
    if (url.includes("/products.json?")) {
      return jsonResponse({
        data: [{
          id: "tote-template",
          blueprint_id: 1389,
          print_provider_id: 10,
          variants: [{ id: 103600, is_enabled: true }],
        }],
        last_page: 1,
      });
    }
    if (url.endsWith("/personalization_options.json")) {
      return jsonResponse([{ field_id: "tote-art", type: "image" }]);
    }
    if (url.endsWith("/uploads/images.json")) return jsonResponse({ id: "tote-upload" });
    if (url.endsWith("/personalization_previews.json") && options.method === "POST") {
      return jsonResponse({ task_id: "tote-task", status: "pending" });
    }
    throw new Error(`Unexpected Printify request: ${url}`);
  };

  const preview = await startHostedProductPreview({
    headers: new Headers({
      "content-type": "image/png",
      "x-haptique-product": "tote",
      "x-haptique-size": encodeURIComponent("16 × 16 in"),
      "x-haptique-handle-color": "Black",
      "x-haptique-design-hash": "hq1_hosted-tote",
    }),
    artwork: pngHeader(2625, 5250),
    env,
    fetchImpl,
  });

  assert.equal(preview.productId, "tote-template");
  assert.equal(preview.variantId, 103600);
  assert.equal(preview.handleColor, "Black");
  assert.match(preview.taskId, /^hps1\./);
});
