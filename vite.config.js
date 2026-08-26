import { defineConfig, loadEnv } from "vite";
import { haptiqueCheckoutPlugin } from "./server/vite-checkout-plugin.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    // Root-relative assets keep working when index.html is served as the SPA
    // fallback for direct links such as /series/moire and /studio/loom.
    base: "/",
    plugins: [
      haptiqueCheckoutPlugin({
        stripeSecretKey: env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        stripeProductsFile: env.STRIPE_PRODUCTS_FILE,
        orderStoreFile: env.ORDER_STORE_FILE,
        shippingRateId: env.STRIPE_SHIPPING_RATE_ID,
        publicSiteUrl: env.PUBLIC_SITE_URL,
        printifyApiToken: env.PRINTIFY_API_TOKEN,
        printifyShopId: env.PRINTIFY_SHOP_ID,
        printifyProductsFile: env.PRINTIFY_PRODUCTS_FILE,
        printifyTotePersonalizationProductId: env.PRINTIFY_TOTE_PERSONALIZATION_PRODUCT_ID,
        printifyFulfillmentMode: env.PRINTIFY_FULFILLMENT_MODE,
        printifyOrderApprovalConfirmed: env.PRINTIFY_ORDER_APPROVAL_CONFIRMED === "true",
      }),
    ],
    build: {
      // Three.js, DialKit, and the simulation make this an intentionally visual-heavy app.
      chunkSizeWarningLimit: 1200,
      target: "es2022",
    },
  };
});
