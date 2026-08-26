import { createPrintifyClient } from "../server/printify-client.mjs";
import {
  findPersonalizableProduct,
  PrintifyPersonalizationError,
  TOTE_BLUEPRINT_ID,
  TOTE_PRINT_PROVIDER_ID,
  TOTE_VARIANT_ID,
} from "../server/printify-personalization.mjs";

const printify = createPrintifyClient({
  token: process.env.PRINTIFY_API_TOKEN,
  shopId: process.env.PRINTIFY_SHOP_ID,
});

const configuredProductId = String(process.env.PRINTIFY_TOTE_PERSONALIZATION_PRODUCT_ID ?? "").trim();
let report;
try {
  const resolved = await findPersonalizableProduct({
    printify,
    configuredProductId,
    blueprintId: TOTE_BLUEPRINT_ID,
    printProviderId: TOTE_PRINT_PROVIDER_ID,
    variantId: TOTE_VARIANT_ID,
  });
  report = {
    previewMode: "personalization",
    source: configuredProductId ? "environment override" : "automatic discovery",
    productId: resolved.product.id,
    title: resolved.product.title,
    fieldId: resolved.imageField.field_id,
    fieldLabel: resolved.imageField.label,
  };
} catch (error) {
  if (!(error instanceof PrintifyPersonalizationError) || error.status !== 503) throw error;
  report = {
    previewMode: "custom_product_fallback",
    message: "No image personalization field found; previews will use Printify Uploads + Products mockups.",
  };
}

console.log(JSON.stringify(report, null, 2));
