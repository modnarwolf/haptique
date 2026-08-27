# Printify integration plan

Haptique stages the storefront, design identifiers, product choices, sizes, and
cart payload locally. Stripe sandbox Checkout is enabled, and four reusable
Printify fulfillment templates now mirror the storefront catalog. Live
fulfillment remains intentionally disabled until merchant operations and
production artwork validation are ready.

## Connection status

- Printify shop: `haptique`
- Shop ID: `22838500`
- Sales channel: `custom_integration`
- Existing Haptique products: four as of August 22, 2026

The reusable API client lives in `server/printify-client.mjs`. It is intentionally
outside `src/` so it cannot be imported into the browser bundle. After placing a
fresh token in an ignored local `.env`, run `npm run verify:printify` to verify
the token, configured shop, and product count without printing the token.

Run `npm run setup:printify-products` to idempotently create or reuse the four
templates. Their IDs are stored in the ignored
`server/data/printify-products.json` file. The templates use an existing
Haptique pattern as preview artwork; order-specific print files must replace it
before any real production run.

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
4. After Stripe confirms payment through a signed webhook, the server can stage
   the matching pre-created Printify product variant using the customer email
   and shipping address collected by Checkout.
5. Keep Printify order approval manual during testing. Send the order to
   production only after payment and artwork validation succeed.
6. Signed Printify webhooks update production, shipment, tracking, and delivery
   state in Haptique. Webhook handlers must be idempotent.

## Product previews and tote personalization

Every product now follows a strict `studio → preview → add to cart` path. Studio
continues to render the editable, single-face Haptique series. Only after
`Preview product` is selected does Haptique privately create the selected
provider's exact production artwork. Posters and canvases use their configured
300 DPI print areas. Woven blankets stay vertical in the Pattern Studio, then
their hidden production sheets rotate 90 degrees clockwise into the provider's
landscape weaving area,
and the Medium Tote uses an
AOP production sheet at exactly 2625 × 5250 px: a 2400 × 2280 pattern face is
scaled to the sheet width, mirrored onto the second face, and reflected through
the 131 px center-gusset bleed. That PNG is never displayed to the customer.

The 16 × 16 in tote supports Black, Beige, White, Red, and Navy handles. Each
selection resolves to its own Printify variant so mockup generation and
fulfillment use the same handle color.

When the shop contains a Tote Bag AOP product with a personalizable image
layer, Haptique discovers the matching blueprint/provider/variant and uses the
Personalization Preview API. Because Printify custom-integration shops may not
expose automated personalization fields, Haptique automatically falls back to
the documented Uploads + Products flow: it creates a customer-specific draft
product with the print-ready image and polls that product for generated mockup
images. In either tote mode,
`PRINTIFY_TOTE_PERSONALIZATION_PRODUCT_ID` is only an optional override when a
shop has more than one matching template. Automated personalization layers must
be configured when the product is created. Run
`npm run verify:printify-personalization` to confirm that the configured product
exposes an image field before testing the browser flow.

At preview time Haptique:

1. validates the PNG signature and the selected provider's exact dimensions;
2. uploads the artwork to Printify's Media Library;
3. requests an asynchronous tote personalization preview when available, or
   creates a customer-specific draft product for any configured product;
4. polls until Printify returns product mockups and displays every returned
   rendered view; and
5. when Add to cart is selected, either creates the per-variant personalization
   configuration or retains the customer-specific product ID for fulfillment.

The cart and paid-order record retain Printify's product and upload IDs for
every product. For a
Personalization API preview they also retain `personalisation_strategy` and
`personalisation_instructions`, which are submitted in the line item's nested
`personalisation` object. Custom preview products fulfill directly by their
customer-specific product ID.

Pre-create products and variants whenever possible. Printify documents that
on-the-fly product creation inside an order is slower and planned for
deprecation. Store product and variant IDs against the stable Haptique design
hash.

## Stripe sandbox status

The local Vite server exposes `POST /api/stripe/checkout`. It validates product,
size, quantity, and price from the server-owned catalog before creating a Stripe
hosted Checkout Session with reusable Price IDs. The integration intentionally
accepts only test-mode restricted or secret keys and explicitly disables Stripe
Managed Payments because Haptique sells physical goods and must collect a
shipping address.

Run `npm run setup:stripe-products` once per Stripe test account to create four
Products with size-specific Prices. The returned identifiers are persisted in
an ignored catalog file. See `docs/stripe-integration.md` for webhook setup,
order-state behavior, and the production boundary.

Run `npm run test:stripe-session` to create a reusable $32 poster smoke-test
session. A signed, idempotent Stripe webhook records paid orders. Mock Printify
handoff is disabled by default. Before enabling it, set the Printify shop's
order approval to **Manual**, then set
`PRINTIFY_ORDER_APPROVAL_CONFIRMED=true` and
`PRINTIFY_FULFILLMENT_MODE=mock_draft`. A verified paid Checkout then creates an
on-hold Printify order with shipping notifications disabled. Haptique never
calls Printify's send-to-production endpoint in mock mode.

Printify warns that new shops can default to automatic approval after 24 hours,
so do not enable mock handoff until the Dashboard setting is visibly Manual.

## Customer confirmation emails

Stripe can send a payment receipt when **Successful payments** is enabled under
Customer emails. Stripe sandbox payments generally do not send receipts to
arbitrary addresses. Printify's order API can optionally send a shipping
notification, but Haptique deliberately disables that for mock orders. For a
production-grade customer experience, Haptique should send its own branded
order confirmation after the signed paid webhook and use signed Printify
webhooks to send production and tracking updates.

## Intended launch sizes

- Art poster: 12 × 16, 18 × 24, 24 × 36 in
- Stretched canvas: 12 × 16, 18 × 24, 24 × 32 in
- Tote: 16 × 16 in
- Woven blanket: 37 × 52, 50 × 60, 60 × 80 in

These are editorial launch choices, not guaranteed Printify variants. Confirm
them against the selected providers' current catalog before accepting payment.
