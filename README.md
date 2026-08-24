# Haptique

Haptique (haptic + boutique) is an interactive textile-design studio for the
browser. It expands on the Cloth3Djs concept by combining procedural pattern
generation, real-time cloth simulation, material authoring, image placement,
studio lighting, and high-resolution export in a single WebGL workspace.

## Studios

- **Material Studio** controls the cloth physics, material finish, holographic
  effects, bump mapping, environment lighting, camera effects, and image/SVG
  decals.
- **Pattern Studio** uses p5.js to create seeded textile patterns with editable
  palettes and print-ready dimensions. Its output is mapped onto the cloth as a
  live texture.

Use the button in the lower-left corner—or press <kbd>~</kbd>—to switch between
the two control panels.

## Interaction

- Drag the cloth to reshape it.
- Orbit and zoom with the mouse; hold <kbd>Space</kbd> while dragging to pan.
- Enable image editing in Material Studio to move decals and use the wheel to
  resize the selected decal.
- Upload images, SVGs, bump maps, and HDR/EXR environment maps locally.
- Export the rendered cloth as a PNG with or without a background, or export a
  flat pattern at its configured print dimensions.

## Development

Requires a current Node.js installation.

```sh
npm install
npm run dev
```

Other commands:

```sh
npm run build
npm run preview
npm run verify:environments
npm run test:payments
npm run test:routing
```

## Pages, URLs, and site content

Public navigation uses browser-history routes, so links can be shared and the
Back and Forward buttons work as expected:

- `/` — shop
- `/studio` and `/studio/:series` — Pattern Studio
- `/about` — about page
- `/series/:series` — campaign series detail page

Edit marketing copy, logo choices, social links, campaign series slugs, and
campaign image paths in `src/data/site-content.js`. Product prices, sizes, and
production identifiers remain in `src/data/product-catalog.js`, while each
procedural pattern implementation remains in `src/pattern-studio/series/`.

### Stripe sandbox Checkout

Haptique's four launch products use Stripe-hosted one-time Checkout with
server-owned product/size prices and a signed, idempotent completion webhook.
Setup and production boundaries are documented in
[`docs/stripe-integration.md`](docs/stripe-integration.md).

### Adding a Pattern Studio series

Every procedural series is a self-contained module in
`src/pattern-studio/series/`. A module exports one series object containing its
stable `sr####` ID, UI name, note, palettes, parameters, and `paint` function.
Shared drawing utilities live in `series/helpers.js`.

To add a series:

1. Copy an existing series module and choose an unused ID such as `sr0080`.
2. Keep all series-specific drawing functions in that module; move only truly
   reusable utilities into `helpers.js`.
3. Import the module and add it once to the ordered `SERIES` array in
   `series/index.js`.

IDs normally advance by 10 so a related variant can be inserted later with an
ID such as `sr0015`. The registry validates ID formatting, duplicates, required
metadata, parameters, palettes, and painter availability when the app loads.

## Project structure

```text
src/
  data/             Baked starting drape
  pattern-studio/   Pattern controls, renderer, and modular series definitions
  rendering/        Materials, textures, and post-processing
  scene/            Three.js scene and interaction layer
  shaders/          Holographic, depth-of-field, and grain GLSL
  simulation/       Cloth and experimental liquid physics
  ui/               React shell and DialKit controls
server/              Sandbox checkout, signed webhook, order state, API clients
public/
  textures/         Default cloth, bump, and pattern textures
  vendor/           Browser-loaded p5.js build
```

Haptique is currently an early-stage project. Uploaded assets and working design
state remain in the browser; the Vite server provides sandbox-only Stripe and
Printify integration helpers, not a production backend or project-file format.
