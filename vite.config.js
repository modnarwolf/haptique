import { defineConfig, loadEnv } from "vite";
import { haptiqueCheckoutPlugin } from "./server/vite-checkout-plugin.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./",
    plugins: [
      haptiqueCheckoutPlugin({
        stripeSecretKey: env.STRIPE_SECRET_KEY,
        publicSiteUrl: env.PUBLIC_SITE_URL,
      }),
    ],
    build: {
      // Three.js, DialKit, and the simulation make this an intentionally visual-heavy app.
      chunkSizeWarningLimit: 1200,
      target: "es2022",
    },
  };
});
