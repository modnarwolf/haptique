# Stripe Checkout integration

Haptique uses Stripe-hosted Checkout for one-time purchases. The implementation
adapts the one-product blueprint to the launch catalog: the poster, canvas, tote,
and blanket are four reusable Stripe Products, with a separate Price for every
available size. Checkout always uses a server-owned `price_…` identifier rather
than trusting a browser-supplied amount.

## Test-mode setup

1. Copy `.env.example` to the ignored `.env` file.
2. Add a test-mode restricted API key to `STRIPE_SECRET_KEY`. Grant only the
   Product, Price, and Checkout Session permissions this service needs. A normal
   `sk_test_…` key also works during setup. Obtain keys from the Stripe Dashboard;
   never commit or expose them through a `VITE_` variable.
3. Run `npm run setup:stripe-products`. This creates four Haptique Products. The
   first size uses `default_price_data`; additional sizes are Prices on the same
   Product. All returned IDs are saved to the ignored
   `server/data/stripe-products.json` file.
4. Run `npm run test:stripe-session` for a $32 poster Checkout smoke test.
5. Forward Stripe test events to
   `http://localhost:5173/api/stripe/webhook`, then put the resulting `whsec_…`
   signing secret in `STRIPE_WEBHOOK_SECRET`.

The client deliberately does not send a `Stripe-Version` header, leaving the
account API version unchanged as required by the blueprint. Checkout omits
`payment_method_types`, allowing Stripe Dashboard payment-method settings and
dynamic payment methods to apply.

## Request flow

- `POST /api/stripe/checkout` validates product, size, quantity, design hash,
  seed, Printify variant, and current Stripe Price against the server catalog.
- A pending order is recorded before the server creates an idempotent Checkout
  Session. Stripe customer, session, payment, and Haptique checkout identifiers
  are associated with that record.
- `POST /api/stripe/webhook` verifies the raw payload with
  `STRIPE_WEBHOOK_SECRET`. Replayed event IDs are idempotent.
- `checkout.session.completed` is recorded, but an order becomes `paid` only
  when Stripe reports `payment_status=paid`. The async-payment success event is
  also supported.
- The success redirect returns to Haptique with a large confirmation dialog over
  the shop. It continuously polls `GET /api/stripe/checkout/status` with a
  capped backoff, shows the verified state and order reference, and never treats
  the redirect query string as proof of payment. No manual refresh is required.

Haptique explicitly disables Stripe Managed Payments for these Sessions because
the account enables it by default and Managed Payments rejects the shipping
address collection needed for physical Printify goods. US shipping addresses
and phone numbers are collected. Set `STRIPE_SHIPPING_RATE_ID` to a test-mode
Shipping Rate when the delivery policy is ready; otherwise no shipping fee is
added.

Stripe Tax is intentionally not enabled. Confirm the required tax registrations
before adding `automatic_tax`, because enabling the flag without registrations
does not make the store tax-compliant.

## Production boundary

The current Vite middleware and JSON order store are suitable for local sandbox
validation only. Before accepting live payments:

- deploy these routes in a durable server/runtime and replace the JSON file with
  a transactional database;
- switch the test-key guard deliberately and use a least-privilege live
  restricted key stored in the hosting platform's secrets system;
- configure a public HTTPS webhook endpoint, shipping rates, refund handling,
  tax registrations, monitoring, and retention policies;
- keep Printify fulfillment paused until the signed webhook reports `paid` and
  the print-ready artwork passes validation.
