# Printify integration plan

Haptique currently stages the storefront, design identifiers, product choices,
sizes, and cart payload locally. Live checkout is intentionally disabled until
merchant credentials and exact production partners are selected.

## What is needed

1. A Printify personal access token with shop, catalog, product, order, upload,
   and webhook read/write scopes.
2. The Printify shop ID for Haptique.
3. One approved blueprint and print provider per launch product: art poster,
   stretched canvas, tote, and woven blanket. Provider choice determines the
   definitive variant IDs, printable dimensions, costs, shipping regions, and
   size availability. Reconcile the intended three-size assortment in
   `src/data/product-catalog.js` with those live variants.
4. A payment processor. Stripe Checkout is recommended so Haptique can collect
   payment before creating and approving the Printify order.
5. A public HTTPS callback URL for signed Printify and Stripe webhooks.

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

## Intended launch sizes

- Art poster: 12 × 16, 18 × 24, 24 × 36 in
- Stretched canvas: 12 × 16, 18 × 24, 24 × 32 in
- Tote: 16 × 16 in
- Woven blanket: 37 × 52, 50 × 60, 60 × 80 in

These are editorial launch choices, not guaranteed Printify variants. Confirm
them against the selected providers' current catalog before accepting payment.
