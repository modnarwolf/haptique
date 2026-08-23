import test from "node:test";
import assert from "node:assert/strict";

import { createPrintifyClient, PrintifyApiError } from "../server/printify-client.mjs";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

test("verifyConnection validates the configured shop and reads product count", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/shops.json")) {
      return jsonResponse([{ id: 22838500, title: "haptique", sales_channel: "custom_integration" }]);
    }
    return jsonResponse({ total: 0, data: [] });
  };

  const client = createPrintifyClient({
    token: "test-token",
    shopId: "22838500",
    fetchImpl,
  });

  const result = await client.verifyConnection();

  assert.equal(result.shop.title, "haptique");
  assert.equal(result.productCount, 0);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-token");
  assert.match(requests[1].url, /shops\/22838500\/products\.json/);
  assert.match(requests[1].url, /limit=50/);
});

test("verifyConnection rejects a shop the token cannot access", async () => {
  const client = createPrintifyClient({
    token: "test-token",
    shopId: "22838500",
    fetchImpl: async () => jsonResponse([{ id: 999, title: "another shop" }]),
  });

  await assert.rejects(
    () => client.verifyConnection(),
    (error) => error instanceof PrintifyApiError && error.status === 403,
  );
});

test("API failures expose status without leaking the token", async () => {
  const client = createPrintifyClient({
    token: "do-not-leak",
    shopId: "22838500",
    fetchImpl: async () => jsonResponse({ message: "Unauthorized" }, { status: 401 }),
  });

  await assert.rejects(
    () => client.listShops(),
    (error) =>
      error instanceof PrintifyApiError &&
      error.status === 401 &&
      !error.message.includes("do-not-leak"),
  );
});

test("catalog methods address the selected blueprint and provider", async () => {
  let requestedUrl;
  const client = createPrintifyClient({
    token: "test-token",
    shopId: "22838500",
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse({ variants: [] });
    },
  });

  await client.listVariants(937, 99);

  assert.equal(
    requestedUrl,
    "https://api.printify.com/v1/catalog/blueprints/937/print_providers/99/variants.json",
  );
});

test("product creation and image upload stay scoped to the configured account", async () => {
  const requests = [];
  const client = createPrintifyClient({
    token: "test-token",
    shopId: "22838500",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return jsonResponse({ id: "printify-resource" });
    },
  });

  await client.uploadImage({ fileName: "haptique.png", contents: "base64-data" });
  await client.createProduct({ title: "Haptique — Art poster" });

  assert.equal(requests[0].url, "https://api.printify.com/v1/uploads/images.json");
  assert.equal(JSON.parse(requests[0].options.body).file_name, "haptique.png");
  assert.equal(
    requests[1].url,
    "https://api.printify.com/v1/shops/22838500/products.json",
  );
});

test("order creation is locked until manual approval is explicitly confirmed", async () => {
  let calls = 0;
  const client = createPrintifyClient({
    token: "test-token",
    shopId: "22838500",
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ id: "order-test" });
    },
  });

  await assert.rejects(
    () => client.createOrder({ external_id: "checkout-test" }),
    (error) => error instanceof PrintifyApiError && error.status === 409,
  );
  assert.equal(calls, 0);

  await client.createOrder(
    { external_id: "checkout-test" },
    { approvalConfirmed: true },
  );
  assert.equal(calls, 1);
});
