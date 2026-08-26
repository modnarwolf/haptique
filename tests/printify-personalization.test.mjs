import assert from "node:assert/strict";
import test from "node:test";

import {
  PrintifyPersonalizationError,
  createImagePersonalizationItem,
  finalizePersonalization,
  findPersonalizableProduct,
  productMockups,
  readPngDimensions,
  startTotePersonalizationPreview,
} from "../server/printify-personalization.mjs";

function pngHeader(width = 2625, height = 5250) {
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test("validates the exact mirrored tote PNG dimensions", () => {
  assert.deepEqual(readPngDimensions(pngHeader()), { width: 2625, height: 5250 });
  assert.throws(
    () => readPngDimensions(Buffer.from("not-png")),
    PrintifyPersonalizationError,
  );
});

test("uses a Printify upload as the personalizable image input", async () => {
  const calls = [];
  const printify = {
    async listProducts() {
      return {
        data: [{ id: "tote-product", blueprint_id: 1389, print_provider_id: 10, variants: [{ id: 103600, is_enabled: true }] }],
        last_page: 1,
      };
    },
    async retrievePersonalizationOptions() {
      return [{ field_id: "tote_artwork", label: "Artwork", type: "image" }];
    },
    async uploadImage(image) {
      calls.push(["upload", image]);
      return { id: "upload-id" };
    },
    async requestPersonalizationPreview(productId, body) {
      calls.push(["preview", productId, body]);
      return { task_id: "task-id", status: "pending", external_id: body.external_id };
    },
  };

  const result = await startTotePersonalizationPreview({
    printify,
    artwork: pngHeader(),
    fileName: "tote.png",
    externalId: "preview-1",
  });

  assert.equal(result.taskId, "task-id");
  assert.equal(result.productId, "tote-product");
  assert.deepEqual(calls[1][2].personalization[0], createImagePersonalizationItem("tote_artwork", "upload-id"));
});

test("auto-discovers the matching product with an image personalization field", async () => {
  const result = await findPersonalizableProduct({
    printify: {
      async listProducts() {
        return { data: [
          { id: "plain", blueprint_id: 1389, print_provider_id: 10, variants: [{ id: 103600 }] },
          { id: "ready", blueprint_id: 1389, print_provider_id: 10, variants: [{ id: 103600 }] },
        ], last_page: 1 };
      },
      async retrievePersonalizationOptions(productId) {
        return productId === "ready" ? [{ field_id: "art", type: "image" }] : [];
      },
    },
    blueprintId: 1389,
    printProviderId: 10,
    variantId: 103600,
  });
  assert.equal(result.product.id, "ready");
  assert.equal(result.imageField.field_id, "art");
});

test("falls back to a custom product mockup when the shop has no personalization template", async () => {
  let created;
  const result = await startTotePersonalizationPreview({
    printify: {
      async listProducts() {
        return { data: [{ id: "ordinary-tote", blueprint_id: 1389, print_provider_id: 10, variants: [{ id: 103600 }] }], last_page: 1 };
      },
      async retrievePersonalizationOptions() { return []; },
      async uploadImage() { return { id: "upload-id" }; },
      async createProduct(body) {
        created = body;
        return {
          id: "custom-tote",
          images: [{ src: "https://mockups.example/tote.jpg", variant_ids: [103600], position: "front" }],
        };
      },
    },
    artwork: pngHeader(),
    externalId: "preview-2",
  });
  assert.equal(result.previewMode, "custom_product");
  assert.equal(result.status, "completed");
  assert.equal(result.mockups[0].src, "https://mockups.example/tote.jpg");
  assert.equal(created.print_areas[0].placeholders[0].images[0].id, "upload-id");
  assert.equal(created.variants[0].id, 103600);
});

test("maps only mockups for the requested product variant", () => {
  assert.deepEqual(productMockups({ images: [
    { src: "https://mockups.example/front.jpg", variant_ids: [103600], position: "front" },
    { src: "https://mockups.example/wrong.jpg", variant_ids: [999], position: "front" },
  ] }, 103600), [{
    variant_id: 103600,
    mockup_id: "front",
    src: "https://mockups.example/front.jpg",
  }]);
});

test("creates personalization only after the preview is approved", async () => {
  let submitted;
  const result = await finalizePersonalization({
    printify: {
      async createPersonalization(productId, body) {
        submitted = { productId, body };
        return {
          personalisation_strategy: "pstudio_pre_order_headless",
          personalisation_instructions: "instructions-id",
        };
      },
    },
    productId: "ready",
    variantId: 103600,
    fieldId: "art",
    uploadId: "upload-id",
  });
  assert.equal(submitted.productId, "ready");
  assert.deepEqual(submitted.body.items[0], createImagePersonalizationItem("art", "upload-id"));
  assert.equal(result.personalisationInstructions, "instructions-id");
});
