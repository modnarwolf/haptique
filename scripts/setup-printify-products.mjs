import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createPrintifyClient } from "../server/printify-client.mjs";
import { PRODUCT_TYPES, productPrice } from "../src/data/product-catalog.js";

const token = process.env.PRINTIFY_API_TOKEN;
const shopId = process.env.PRINTIFY_SHOP_ID;
const catalogPath = resolve(
  process.env.PRINTIFY_PRODUCTS_FILE || "server/data/printify-products.json",
);
const artworkPath = resolve(
  process.env.PRINTIFY_TEMPLATE_ARTWORK || "public/textures/patterns/pattern_ori.png",
);
const printify = createPrintifyClient({ token, shopId });

function productTitle(product) {
  return `Haptique — ${product.name}`;
}

async function readCatalog() {
  try {
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    if (String(catalog?.shopId) === String(shopId) && catalog?.products) return catalog;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return { shopId: String(shopId), products: {} };
}

async function writeCatalog(catalog) {
  await mkdir(dirname(catalogPath), { recursive: true });
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(temporaryPath, catalogPath);
}

async function listAllProducts() {
  const products = [];
  for (let page = 1; page <= 20; page += 1) {
    const response = await printify.listProducts({ page, limit: 50 });
    products.push(...(response.data ?? []));
    if (!response.last_page || page >= response.last_page) break;
  }
  return products;
}

const connection = await printify.verifyConnection();
const catalog = await readCatalog();
const existingProducts = await listAllProducts();

let imageId = catalog.artwork?.imageId;
if (!imageId) {
  const contents = (await readFile(artworkPath)).toString("base64");
  const uploaded = await printify.uploadImage({
    fileName: "haptique-fulfillment-template.png",
    contents,
  });
  if (!uploaded.id) throw new Error("Printify did not return an uploaded artwork ID");
  imageId = uploaded.id;
  catalog.artwork = {
    imageId,
    fileName: uploaded.file_name ?? "haptique-fulfillment-template.png",
  };
  await writeCatalog(catalog);
  console.log("Uploaded the Haptique fulfillment template artwork");
}

for (const product of PRODUCT_TYPES) {
  const title = productTitle(product);
  let existing = existingProducts.find(
    (candidate) => candidate.title === title &&
      candidate.blueprint_id === product.printify.blueprintId &&
      candidate.print_provider_id === product.printify.printProviderId,
  );

  if (!existing && catalog.products[product.id]?.productId) {
    try {
      existing = await printify.retrieveProduct(catalog.products[product.id].productId);
    } catch {
      existing = null;
    }
  }

  if (!existing) {
    const variantIds = product.sizes.map((size) => product.printify.variantIds[size]);
    existing = await printify.createProduct({
      title,
      description: `${product.description} Haptique fulfillment template; customer artwork replaces the preview before production.`,
      blueprint_id: product.printify.blueprintId,
      print_provider_id: product.printify.printProviderId,
      variants: product.sizes.map((size) => ({
        id: product.printify.variantIds[size],
        price: Math.round(productPrice(product.id, size) * 100),
        is_enabled: true,
      })),
      print_areas: [{
        variant_ids: variantIds,
        placeholders: [{
          position: "front",
          images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
        }],
      }],
    });
    console.log(`Created ${title}`);
  } else {
    console.log(`Reusing ${title}`);
  }

  catalog.products[product.id] = {
    productId: existing.id,
    title: existing.title ?? title,
    blueprintId: product.printify.blueprintId,
    printProviderId: product.printify.printProviderId,
    variants: Object.fromEntries(
      product.sizes.map((size) => [size, product.printify.variantIds[size]]),
    ),
  };
  catalog.updatedAt = new Date().toISOString();
  await writeCatalog(catalog);
}

console.log(
  `Printify catalog ready for ${Object.keys(catalog.products).length} products in ${connection.shop.title}`,
);
