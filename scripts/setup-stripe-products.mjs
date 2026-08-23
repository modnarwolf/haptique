import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createStripeClient } from "../server/stripe-client.mjs";
import { stripeCatalogKey } from "../server/stripe-catalog.mjs";
import { PRODUCT_TYPES, productPrice } from "../src/data/product-catalog.js";

const secretKey = process.env.STRIPE_SECRET_KEY;
const catalogPath = resolve(
  process.env.STRIPE_PRODUCTS_FILE || "server/data/stripe-products.json",
);
const stripe = createStripeClient({ secretKey });
const account = await stripe.retrieveAccount();

function emptyCatalog() {
  return {
    accountId: account.id,
    livemode: account.livemode,
    currency: "usd",
    products: {},
    prices: {},
  };
}

async function readCatalog() {
  try {
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    if (catalog?.accountId !== account.id || catalog?.livemode !== account.livemode) {
      console.log("Stripe account changed; starting a fresh local product catalog.");
      return emptyCatalog();
    }
    return catalog?.prices && catalog?.products ? catalog : emptyCatalog();
  } catch (error) {
    if (error.code === "ENOENT") return emptyCatalog();
    throw error;
  }
}

async function writeCatalog(catalog) {
  await mkdir(dirname(catalogPath), { recursive: true });
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(temporaryPath, catalogPath);
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function priceMetadata(product, size) {
  return {
    haptique_product_id: product.id,
    haptique_size: size,
    printify_variant_id: product.printify.variantIds[size],
  };
}

function lookupKey(productId, size) {
  return `haptique_${productId}_${fingerprint(size).slice(0, 10)}`;
}

const catalog = await readCatalog();
for (const product of PRODUCT_TYPES) {
  const defaultSize = product.sizes[0];
  const defaultKey = stripeCatalogKey(product.id, defaultSize);
  let productEntry = catalog.products[product.id];

  if (!productEntry?.productId || !catalog.prices[defaultKey]?.priceId) {
    const unitAmount = Math.round(productPrice(product.id, defaultSize) * 100);
    const created = await stripe.createProductWithDefaultPrice({
      name: product.name,
      description: `${product.description} Made to order from a customer-selected Haptique design.`,
      unitAmount,
      productMetadata: {
        haptique_product_id: product.id,
        printify_blueprint_id: product.printify.blueprintId,
        printify_provider_id: product.printify.printProviderId,
      },
      priceMetadata: priceMetadata(product, defaultSize),
      idempotencyKey: `haptique-product-${fingerprint(`${account.id}:${product.id}:usd:${unitAmount}`)}`,
    });
    if (!created.id?.startsWith("prod_") || !String(created.default_price).startsWith("price_")) {
      throw new Error(`Stripe did not return a product and default price for ${product.id}`);
    }
    productEntry = {
      productId: created.id,
      productName: product.name,
      defaultPriceId: created.default_price,
    };
    catalog.products[product.id] = productEntry;
    catalog.prices[defaultKey] = {
      productId: created.id,
      priceId: created.default_price,
      unitAmount,
      productName: product.name,
      size: defaultSize,
    };
    catalog.updatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    console.log(`Created ${product.name} with default size ${defaultSize}`);
  } else {
    console.log(`Reusing ${product.name}`);
  }

  for (const size of product.sizes.slice(1)) {
    const key = stripeCatalogKey(product.id, size);
    if (catalog.prices[key]?.priceId) {
      console.log(`Reusing ${product.name} — ${size}`);
      continue;
    }
    const unitAmount = Math.round(productPrice(product.id, size) * 100);
    const created = await stripe.createPrice({
      productId: productEntry.productId,
      unitAmount,
      nickname: size,
      lookupKey: lookupKey(product.id, size),
      metadata: priceMetadata(product, size),
      idempotencyKey: `haptique-price-${fingerprint(`${account.id}:${key}:usd:${unitAmount}`)}`,
    });
    if (!created.id?.startsWith("price_") || created.product !== productEntry.productId) {
      throw new Error(`Stripe did not return a matching Price for ${key}`);
    }
    catalog.prices[key] = {
      productId: productEntry.productId,
      priceId: created.id,
      unitAmount,
      productName: product.name,
      size,
    };
    catalog.updatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    console.log(`Created ${product.name} — ${size}`);
  }
}

console.log(
  `Stripe test catalog ready for ${Object.keys(catalog.products).length} products and ${Object.keys(catalog.prices).length} prices at ${catalogPath}`,
);
