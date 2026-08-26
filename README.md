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
- The Medium Tote AOP print preset exports a 2625 × 5250 PNG. It expands a
  2400 × 2280 face across the sheet width, mirrors it onto the second side, and
  mirror-bleeds both faces through the center gusset so the fold has no blank
  strip.

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
```

## Project structure

```text
src/
  data/             Baked starting drape
  pattern-studio/   Pattern data, controls, and p5 renderer
  rendering/        Materials, textures, and post-processing
  scene/            Three.js scene and interaction layer
  shaders/          Holographic, depth-of-field, and grain GLSL
  simulation/       Cloth and experimental liquid physics
  ui/               React shell and DialKit controls
public/
  textures/         Default cloth, bump, and pattern textures
  vendor/           Browser-loaded p5.js build
```

Haptique is currently an early-stage, client-side project. Uploaded assets and
working state remain in the browser; there is no backend or project-file format
yet.
