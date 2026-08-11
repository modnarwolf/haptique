import { createCheckoutForCart, CheckoutValidationError } from "./checkout-service.mjs";
import { createStripeClient, StripeApiError } from "./stripe-client.mjs";

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json;charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

async function readJson(request, maxBytes = 1_000_000) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new CheckoutValidationError("Checkout payload is too large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CheckoutValidationError("Checkout payload must be valid JSON");
  }
}

export function haptiqueCheckoutPlugin({ stripeSecretKey, publicSiteUrl }) {
  return {
    name: "haptique-checkout-api",
    configureServer(server) {
      server.middlewares.use("/api/stripe/checkout", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const stripe = createStripeClient({ secretKey: stripeSecretKey });
          const body = await readJson(request);
          const session = await createCheckoutForCart({
            items: body.items,
            checkoutId: body.checkoutId,
            origin: publicSiteUrl || "http://localhost:5173",
            stripe,
          });
          sendJson(response, 200, { id: session.id, url: session.url });
        } catch (error) {
          const expected =
            error instanceof CheckoutValidationError || error instanceof StripeApiError;
          sendJson(response, error.status ?? 500, {
            error: expected ? error.message : "Checkout could not be started",
          });
        }
      });
    },
  };
}

