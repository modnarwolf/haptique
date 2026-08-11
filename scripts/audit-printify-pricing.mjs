import { PRODUCT_TYPES } from "../src/data/product-catalog.js";

const TARGET_MARGIN = 0.5;
const TARGET_MARKET = "USA";
const CATALOG_SERVICE_URL =
  "https://printify.com/product-catalog-service/api/v2/blueprints";

function minimumWholeDollarPrice(costCents, targetMargin = TARGET_MARGIN) {
  return Math.ceil(costCents / 100 / (1 - targetMargin));
}

function margin(price, costCents) {
  return (price - costCents / 100) / price;
}

const rows = [];
let hasUnderpricedVariant = false;

for (const product of PRODUCT_TYPES) {
  const { blueprintId, printProviderId, variantIds } = product.printify;
  const url =
    `${CATALOG_SERVICE_URL}/${blueprintId}/print-providers/${printProviderId}` +
    `/variants?target_market=${TARGET_MARKET}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Printify pricing request failed (${response.status}) for ${product.id}`);
  }

  const payload = await response.json();
  const liveVariants = new Map(payload.data.map((variant) => [variant.id, variant]));

  for (const [index, size] of product.sizes.entries()) {
    const variantId = variantIds[size];
    const variant = liveVariants.get(variantId);

    if (!variant?.costs?.[0]) {
      throw new Error(`No live Printify cost found for ${product.id} ${size} (${variantId})`);
    }

    const standardCostCents = variant.costs[0].result;
    const premiumCostCents = variant.costs[0].result_subscription;
    const retailPrice = product.prices[index];
    const minimumPrice = minimumWholeDollarPrice(standardCostCents);
    const passes = retailPrice >= minimumPrice;
    hasUnderpricedVariant ||= !passes;

    rows.push({
      product: product.id,
      size,
      variantId,
      standardCost: standardCostCents / 100,
      premiumCost: premiumCostCents / 100,
      retailPrice,
      grossMargin: Number((margin(retailPrice, standardCostCents) * 100).toFixed(1)),
      minimumPriceFor50PercentMargin: minimumPrice,
      passes,
    });
  }
}

console.log(
  JSON.stringify(
    {
      targetMarginPercent: TARGET_MARGIN * 100,
      targetMarket: TARGET_MARKET,
      shippingAndPaymentFeesIncluded: false,
      rows,
    },
    null,
    2,
  ),
);

if (hasUnderpricedVariant) {
  process.exitCode = 1;
}

