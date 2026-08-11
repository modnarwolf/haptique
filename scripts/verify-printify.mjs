import { createPrintifyClient, PrintifyApiError } from "../server/printify-client.mjs";
import { PRODUCT_TYPES } from "../src/data/product-catalog.js";

const token = process.env.PRINTIFY_API_TOKEN;
const shopId = process.env.PRINTIFY_SHOP_ID;

if (!token || !shopId) {
  console.error(
    "Missing PRINTIFY_API_TOKEN or PRINTIFY_SHOP_ID. Set them in the server environment before running this check.",
  );
  process.exitCode = 1;
} else {
  try {
    const printify = createPrintifyClient({ token, shopId });
    const { shop, productCount } = await printify.verifyConnection();
    const catalog = [];

    for (const product of PRODUCT_TYPES) {
      const { blueprintId, printProviderId, variantIds } = product.printify;
      const providerCatalog = await printify.listVariants(blueprintId, printProviderId);
      const availableVariantIds = new Set(providerCatalog.variants.map((variant) => variant.id));
      const missingSizes = product.sizes.filter(
        (size) => !variantIds[size] || !availableVariantIds.has(variantIds[size]),
      );

      if (missingSizes.length) {
        throw new PrintifyApiError(
          `Catalog mapping for ${product.id} is missing live variants: ${missingSizes.join(", ")}`,
          { status: 422 },
        );
      }

      catalog.push({
        product: product.id,
        blueprintId,
        printProviderId,
        variants: product.sizes.map((size) => ({ size, variantId: variantIds[size] })),
      });
    }

    console.log(
      JSON.stringify(
        {
          connected: true,
          shopId: shop.id,
          title: shop.title,
          salesChannel: shop.sales_channel,
          productCount,
          catalog,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (error instanceof PrintifyApiError) {
      console.error(`Printify connection failed (${error.status ?? "unknown"}): ${error.message}`);
    } else {
      console.error(`Printify connection failed: ${error.message}`);
    }
    process.exitCode = 1;
  }
}
