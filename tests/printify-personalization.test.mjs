import assert from "node:assert/strict";
import test from "node:test";

import {
  PrintifyPersonalizationError,
  createImagePersonalizationItem,
  createPreviewProductKey,
  createPreviewProductTitle,
  finalizePersonalization,
  findPersonalizableProduct,
  productMockups,
  readPngDimensions,
  startProductPreview,
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
    designHash: "hq1_tote-design",
    externalId: "preview-2",
  });
  assert.equal(result.previewMode, "custom_product");
  assert.equal(result.status, "completed");
  assert.equal(result.mockups[0].src, "https://mockups.example/tote.jpg");
  assert.equal(created.print_areas[0].placeholders[0].images[0].id, "upload-id");
  assert.equal(created.variants[0].id, 103600);
});

test("creates a custom Printify preview for a configured non-tote product", async () => {
  let created;
  const result = await startProductPreview({
    printify: {
      async listProducts() { return { data: [], last_page: 1 }; },
      async uploadImage() { return { id: "poster-upload" }; },
      async createProduct(body) {
        created = body;
        return {
          id: "custom-poster",
          images: [{ src: "https://mockups.example/poster.jpg", variant_ids: [100780], position: "front" }],
        };
      },
    },
    artwork: pngHeader(3600, 4800),
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
    retailPrice: 3200,
    expectedWidth: 3600,
    expectedHeight: 4800,
    productName: "Art poster",
    productId: "poster",
    designHash: "hq1_poster-design",
    externalId: "preview-poster",
  });

  assert.equal(result.productId, "custom-poster");
  assert.equal(result.previewMode, "custom_product");
  assert.equal(created.blueprint_id, 852);
  assert.equal(created.variants[0].id, 100780);
  assert.equal(created.print_areas[0].placeholders[0].images[0].id, "poster-upload");
});

test("stable preview keys distinguish product types and variants", () => {
  const common = {
    designHash: "hq1_same-design",
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
  };
  const poster = createPreviewProductKey({ ...common, productId: "poster" });
  const canvas = createPreviewProductKey({ ...common, productId: "canvas" });
  const largerPoster = createPreviewProductKey({ ...common, productId: "poster", variantId: 76784 });

  assert.equal(poster.length, 64);
  assert.notEqual(poster, canvas);
  assert.notEqual(poster, largerPoster);
  assert.equal(createPreviewProductTitle({ ...common, productId: "poster" }), "Haptique preview — poster");
});

test("reuses the matching custom Printify product without another upload", async () => {
  const products = [];
  let uploads = 0;
  let creations = 0;
  const printify = {
    shopId: "shop-1",
    async listProducts() { return { data: products, last_page: 1 }; },
    async retrieveProduct(productId) { return products.find((product) => product.id === productId); },
    async uploadImage() {
      uploads += 1;
      return { id: "stable-upload" };
    },
    async createProduct(body) {
      creations += 1;
      const product = {
        ...body,
        id: "stable-product",
        images: [{ src: "https://mockups.example/stable.jpg", variant_ids: [100780], position: "front" }],
      };
      products.push(product);
      return product;
    },
  };
  const options = {
    printify,
    artwork: pngHeader(3600, 4800),
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
    retailPrice: 3200,
    expectedWidth: 3600,
    expectedHeight: 4800,
    productName: "Art poster",
    productId: "poster",
    designHash: "hq1_revisited-design",
  };

  const first = await startProductPreview(options);
  const second = await startProductPreview(options);

  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(products[0].title, "Haptique preview — poster");
  assert.equal(products[0].description, options.designHash);
  assert.equal(second.productId, first.productId);
  assert.equal(second.uploadId, first.uploadId);
  assert.equal(uploads, 1);
  assert.equal(creations, 1);
});

test("the recipe description distinguishes designs that share a short title", async () => {
  const products = [];
  let creations = 0;
  const printify = {
    shopId: "shop-descriptions",
    async listProducts() { return { data: products, last_page: 1 }; },
    async retrieveProduct(productId) { return products.find((product) => product.id === productId); },
    async uploadImage() { return { id: `upload-${creations + 1}` }; },
    async createProduct(body) {
      creations += 1;
      const product = { ...body, id: `product-${creations}`, images: [] };
      products.push(product);
      return product;
    },
  };
  const options = {
    printify,
    artwork: pngHeader(3600, 4800),
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
    retailPrice: 3200,
    expectedWidth: 3600,
    expectedHeight: 4800,
    productName: "Art poster",
    productId: "poster",
  };

  await startProductPreview({ ...options, designHash: "hq1_first-recipe" });
  await startProductPreview({ ...options, designHash: "hq1_second-recipe" });

  assert.equal(creations, 2);
  assert.deepEqual(products.map(({ title, description }) => ({ title, description })), [
    { title: "Haptique preview — poster", description: "hq1_first-recipe" },
    { title: "Haptique preview — poster", description: "hq1_second-recipe" },
  ]);
});

test("reuses products created with the previous long hash title", async () => {
  const identity = {
    designHash: "hq1_legacy-title-recipe",
    productId: "poster",
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
  };
  const legacyProduct = {
    id: "legacy-product",
    title: `Haptique preview v1 — poster — ${createPreviewProductKey(identity)}`,
    description: "Customer-approved Haptique art poster artwork created through the product preview flow.",
    blueprint_id: 852,
    print_provider_id: 73,
    variants: [{ id: 100780, is_enabled: true }],
    print_areas: [{
      variant_ids: [100780],
      placeholders: [{ position: "front", images: [{ id: "legacy-upload" }] }],
    }],
    images: [],
  };
  let creations = 0;
  const result = await startProductPreview({
    printify: {
      shopId: "shop-legacy",
      async listProducts() { return { data: [legacyProduct], last_page: 1 }; },
      async retrieveProduct() { return legacyProduct; },
      async uploadImage() { throw new Error("legacy reuse should not upload"); },
      async createProduct() { creations += 1; },
    },
    artwork: pngHeader(3600, 4800),
    ...identity,
    retailPrice: 3200,
    expectedWidth: 3600,
    expectedHeight: 4800,
    productName: "Art poster",
  });

  assert.equal(result.reused, true);
  assert.equal(result.productId, "legacy-product");
  assert.equal(result.uploadId, "legacy-upload");
  assert.equal(creations, 0);
});

test("coalesces simultaneous custom preview creation for the same stable key", async () => {
  let uploads = 0;
  let creations = 0;
  const printify = {
    shopId: "shop-concurrent",
    async listProducts() { return { data: [], last_page: 1 }; },
    async uploadImage() {
      uploads += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { id: "concurrent-upload" };
    },
    async createProduct(body) {
      creations += 1;
      return {
        ...body,
        id: "concurrent-product",
        images: [{ src: "https://mockups.example/concurrent.jpg", variant_ids: [100780], position: "front" }],
      };
    },
  };
  const options = {
    printify,
    artwork: pngHeader(3600, 4800),
    blueprintId: 852,
    printProviderId: 73,
    variantId: 100780,
    retailPrice: 3200,
    expectedWidth: 3600,
    expectedHeight: 4800,
    productName: "Art poster",
    productId: "poster",
    designHash: "hq1_concurrent-design",
  };

  const [first, second] = await Promise.all([
    startProductPreview(options),
    startProductPreview(options),
  ]);

  assert.equal(first.productId, second.productId);
  assert.equal(uploads, 1);
  assert.equal(creations, 1);
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
