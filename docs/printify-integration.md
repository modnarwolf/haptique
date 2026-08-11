# Printify integration plan

Haptique currently stages the storefront, design identifiers, product choices,
sizes, and cart payload locally. Live checkout is intentionally disabled until
merchant credentials and exact production partners are selected.

## Connection status

- Printify shop: `haptique`
- Shop ID: `22838500`
- Sales channel: `custom_integration`
- Existing products: none as of August 10, 2026

The reusable API client lives in `server/printify-client.mjs`. It is intentionally
outside `src/` so it cannot be imported into the browser bundle. After placing a
fresh token in an ignored local `.env`, run `npm run verify:printify` to verify
the token, configured shop, and product count without printing the token.

## Initial catalog mapping

The local catalog now pins a live blueprint, provider, and variant for every
launch size. This is deliberately validated before any product or order write.

| Haptique product | Printify blueprint | Provider | Variant IDs |
| --- | ---: | --- | --- |
| Art poster | 852, Vertical and Horizontal Matte Posters | 73, Printed Simply | 100780, 76784, 76787 |
| Stretched canvas | 937, Matte Canvas 0.75 in | 99, Printify Choice | 82230, 82232, 82234 |
| Everyday tote | 1389, Tote Bag AOP | 10, MWW On Demand | 103600, black handles |
| Woven blanket | 1626, Woven Blanket | 99, Printify Choice | 112794, 112795, 112796, artwork mode |

Printify Choice is used where available to favor automated routing. Before the
first paid launch, order samples to confirm color, edge treatment, and material
quality; the IDs remain easy to swap without changing the storefront contract.

## Pricing audit

Production costs were verified against Printify's USA catalog on August 10,
2026. `npm run verify:pricing` compares every configured variant with its live
standard and Premium costs and fails if a storefront price falls below a 50%
gross product margin.

The audit deliberately uses standard, non-Premium costs as the pricing floor.
Shipping, tax, refunds, discounts, and payment-processing fees are not included;
shipping should be charged separately at checkout, and payment fees should be
added to the profitability model once the processor is selected.

| Product | Size | Standard cost | Premium cost | Haptique price | Gross margin |
| --- | --- | ---: | ---: | ---: | ---: |
| Art poster | 12 × 16 in | $10.14 | $7.35 | $32 | 68.3% |
| Art poster | 18 × 24 in | $20.18 | $14.62 | $46 | 56.1% |
| Art poster | 24 × 36 in | $32.21 | $23.34 | $65 | 50.4% |
| Stretched canvas | 12 × 16 in | $21.71 | $15.54 | $78 | 72.2% |
| Stretched canvas | 18 × 24 in | $25.03 | $17.91 | $112 | 77.7% |
| Stretched canvas | 24 × 32 in | $55.75 | $39.90 | $148 | 62.3% |
| Everyday tote | 16 × 16 in | $15.14 | $11.31 | $38 | 60.2% |
| Woven blanket | 37 × 52 in | $28.26 | $21.42 | $124 | 77.2% |
| Woven blanket | 50 × 60 in | $38.88 | $29.46 | $158 | 75.4% |
| Woven blanket | 60 × 80 in | $59.63 | $45.19 | $196 | 69.6% |

## What is needed

1. A Printify personal access token with shop, catalog, product, order, upload,
   and webhook read/write scopes.
2. The Printify shop ID for Haptique: `22838500`.
3. One approved blueprint and print provider per launch product: art poster,
   stretched canvas, tote, and woven blanket. Provider choice determines the
   definitive variant IDs, printable dimensions, costs, shipping regions, and
   size availability. Reconcile the intended three-size assortment in
   `src/data/product-catalog.js` with those live variants.
4. A Stripe webhook signing secret. The test secret key is connected and the
   storefront can create hosted sandbox Checkout Sessions, but fulfillment must
   wait for a verified `checkout.session.completed` webhook.
5. A public HTTPS callback URL for signed Printify and Stripe webhooks.
6. A shipping-price policy. Checkout currently collects a US shipping address
   but does not add a shipping charge; production checkout must quote or apply
   an explicit shipping rate before payment.

Keep every secret in server-side environment values. Do not place a Printify
token in Vite variables, browser storage, client JavaScript, or source control.

## Recommended order flow

1. The browser sends series, seed, palette/parameter snapshot, product, size,
   quantity, and shipping selection to Haptique's server.
2. The server validates price and Printify variant IDs from its own catalog.
3. Stripe creates Checkout. Its idempotent order ID becomes the external order
   reference.
4. After Stripe confirms payment, the server uploads or reuses the print-ready
   PNG and submits the matching pre-created Printify product variant.
5. Keep Printify order approval manual during testing. Send the order to
   production only after payment and artwork validation succeed.
6. Signed Printify webhooks update production, shipment, tracking, and delivery
   state in Haptique. Webhook handlers must be idempotent.

Pre-create products and variants whenever possible. Printify documents that
on-the-fly product creation inside an order is slower and planned for
deprecation. Store product and variant IDs against the stable Haptique design
hash.

## Stripe sandbox status

The local Vite server exposes `POST /api/stripe/checkout`. It validates product,
size, quantity, and price from the server-owned catalog before creating a Stripe
hosted Checkout Session. The integration intentionally accepts only `sk_test_`
keys and explicitly disables Stripe Managed Payments because Haptique sells
physical goods and must collect a shipping address.

Run `npm run test:stripe-session` to create a reusable $32 poster smoke-test
session. This does not create or approve a Printify order. The next payment
milestone is a signed, idempotent Stripe webhook handler; only after that should
the handler create a Printify draft order, initially with production approval
kept manual.

## Intended launch sizes

- Art poster: 12 × 16, 18 × 24, 24 × 36 in
- Stretched canvas: 12 × 16, 18 × 24, 24 × 32 in
- Tote: 16 × 16 in
- Woven blanket: 37 × 52, 50 × 60, 60 × 80 in

These are editorial launch choices, not guaranteed Printify variants. Confirm
them against the selected providers' current catalog before accepting payment.
