import * as React from "react";
import { createPortal } from "react-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { DialStore, useDialKitController } from "dialkit";
import { FINISH_PRESETS, MATERIAL_PRESETS } from "../config.js";
import { readEnvironmentFile } from "../haptique-features.js";
import { P5PatternEngine } from "../pattern-studio/p5-pattern-engine.js";
import { createDefaultPatternState } from "../pattern-studio/pattern-data.js";
import { HaptiqueScene } from "../scene/haptique-scene.js";
import { HAPTIQUE_DIAL_CONFIG } from "./haptique-dials.js";
import { OSShell } from "./os-shell.js";

function useButtonPortalTarget(n) {
  const [t, e] = React.useState(null),
    s = React.useRef(null);
  return (
    React.useEffect(() => {
      const r = () => {
        let f = null;
        if (
          (document.querySelectorAll("button").forEach((m) => {
            m.textContent?.trim() === n && (f = m);
          }),
          !f)
        ) {
          s.current && ((s.current = null), e(null));
          return;
        }
        const d = f.nextElementSibling;
        if (d && d.dataset.holochip === n) {
          s.current !== d && ((s.current = d), e(d));
          return;
        }
        const h = document.createElement("div");
        ((h.dataset.holochip = n), f.insertAdjacentElement("afterend", h), (s.current = h), e(h));
      };
      r();
      const l = new MutationObserver(r);
      l.observe(document.body, { childList: !0, subtree: !0 });
      const c = window.setInterval(r, 1e3);
      return () => {
        (l.disconnect(), window.clearInterval(c), s.current?.remove(), (s.current = null));
      };
    }, [n]),
    t
  );
}
function ImageThumbnail({ thumb: n, label: t, onRemove: e }) {
  return jsxs("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 8px",
      margin: "6px 0",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: 11,
      color: "#c9cbd2",
      userSelect: "none",
    },
    children: [
      jsx("img", {
        src: n,
        alt: t,
        style: { width: 28, height: 28, objectFit: "cover", borderRadius: 4, display: "block" },
      }),
      jsx("span", {
        style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        children: t,
      }),
      jsx("button", {
        onClick: e,
        title: `Remove ${t}`,
        style: {
          background: "rgba(255,255,255,0.08)",
          border: "none",
          borderRadius: 5,
          color: "#e8e9ee",
          width: 20,
          height: 20,
          lineHeight: "18px",
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        },
        children: "✕",
      }),
    ],
  });
}
function loadImageWithProgress(n, t) {
  return new Promise((e, s) => {
    const r = new XMLHttpRequest();
    (r.open("GET", n, !0),
      (r.responseType = "blob"),
      (r.onprogress = (l) => {
        l.lengthComputable && t(l.loaded, l.total);
      }),
      (r.onload = () => {
        if (r.status < 200 || r.status >= 300) {
          s(new Error(`${n}: HTTP ${r.status}`));
          return;
        }
        const l = URL.createObjectURL(r.response),
          c = new Image();
        ((c.onload = () => {
          (URL.revokeObjectURL(l), e(c));
        }),
          (c.onerror = () => {
            (URL.revokeObjectURL(l), s(new Error(`${n}: decode failed`)));
          }),
          (c.src = l));
      }),
      (r.onerror = () => s(new Error(`${n}: network error`))),
      r.send());
  });
}
function LoadingOverlay({ percent: n, hiding: t }) {
  const s = 2 * Math.PI * 26;
  return jsx("div", {
    className: "cloth-loading",
    style: {
      opacity: t ? 0 : 1,
      pointerEvents: t ? "none" : "auto",
    },
    children: jsxs("svg", {
      width: "72",
      height: "72",
      viewBox: "0 0 72 72",
      children: [
        jsx("circle", {
          cx: "36",
          cy: "36",
          r: 26,
          fill: "none",
          stroke: "rgba(255,255,255,0.09)",
          strokeWidth: "2",
        }),
        jsx("circle", {
          cx: "36",
          cy: "36",
          r: 26,
          fill: "none",
          stroke: "rgba(255,255,255,0.85)",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeDasharray: s,
          strokeDashoffset: s * (1 - n / 100),
          transform: "rotate(-90 36 36)",
          style: { transition: "stroke-dashoffset 0.15s linear" },
        }),
        jsxs("text", {
          x: "36",
          y: "36",
          textAnchor: "middle",
          dominantBaseline: "central",
          fill: "#c9cbd2",
          fontSize: "12",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          children: [Math.round(n), "%"],
        }),
      ],
    }),
  });
}
function readFileAsImage(n, t) {
  const e = URL.createObjectURL(n),
    s = new Image();
  ((s.onload = () => {
    (URL.revokeObjectURL(e), t(s));
  }),
    (s.src = e));
}

// --------------------------------------------------------------------------
// ROOT COMPONENT
// Instantiates HaptiqueScene against the canvas host, loads pattern_A.png and
// default_bump.jpg with progress reporting, then reveals the scene. Asset
// failure is caught so the scene still appears, just without those maps.
// --------------------------------------------------------------------------
function ClothExperience({ patternState, studioActionsRef }) {
  const n = React.useRef(null),
    t = React.useRef(null),
    patternEngineRef = React.useRef(null),
    e = React.useRef(null),
    s = React.useRef(null),
    r = React.useRef(null),
    rHDR = React.useRef(null),
    l = useDialKitController(
      "Haptique",
      HAPTIQUE_DIAL_CONFIG,
      {
        id: "haptique",
        onAction: (L) => {
          const N = L.split(".").pop(),
            z = t.current;
          z &&
            (N === "resetCloth"
              ? z.resetCloth(c.physics?.seed ?? 1)
              : N === "resetFlatCloth"
                ? z.resetFlatCloth()
              : N === "poke"
                ? z.poke()
                : N === "uploadHDR"
                    ? rHDR.current?.click()
                    : N === "resetEnvironment"
                      ? (z.resetEnvironment(),
                        l.setValues({
                          render: { useHDR: !0, environment: 0.28, environmentRotation: 0 },
                        }))
                    : N === "exportPNG"
                      ? z.exportPNG(!1)
                      : N === "exportPNGClear"
                        ? z.exportPNG(!0)
                        : N === "addImage"
                          ? e.current?.click()
                          : N === "makeCloth"
                            ? s.current?.click()
                            : N === "uploadBump"
                              ? r.current?.click()
                              : N === "pickFocus"
                                ? z.startPickFocus()
                                : N === "autoFocus"
                                  ? z.clearPickFocus()
                                  : N === "clearImages" &&
                                    (z.clearImages(), l.setValues({ images: { useImage: !1 } })));
        },
      },
    ),
    c = l.values,
    [, f] = React.useState(0),
    [d, h] = React.useState(0),
    [m, y] = React.useState(!1),
    [g, _] = React.useState(!1);
  React.useEffect(() => {
    if (!n.current) return;
    const L = new HaptiqueScene(n.current);
    const pattern = new P5PatternEngine((canvas, width, height) => {
      if (t.current !== L) return;
      L.setPatternCanvas(canvas, width, height);
      l.setValues({ images: { useImage: !0 } });
    });
    pattern.setState(patternState);
    ((t.current = L),
      (patternEngineRef.current = pattern),
      (L.onDecalSelect = (W, I) => {
        l.setValues({ images: { scale: W, rotation: I } });
      }),
      (L.onImagesChanged = () => f((W) => W + 1)));
    const N = [
        { url: "./textures/patterns/pattern_A.png", loaded: 0, total: 0, done: !1 },
        { url: "./textures/default_bump.jpg", loaded: 0, total: 0, done: !1 },
      ],
      z = () => {
        const W = N.reduce((Y, $) => Y + $.total, 0),
          I = N.reduce((Y, $) => Y + $.loaded, 0),
          V = W > 0 ? (I / W) * 100 : (N.filter((Y) => Y.done).length / N.length) * 100;
        h((Y) => Math.max(Y, Math.min(100, V)));
      };
    Promise.all(
      N.map((W) =>
        loadImageWithProgress(W.url, (I, V) => {
          ((W.loaded = I), (W.total = V), z());
        }).then((I) => ((W.done = !0), (W.loaded = W.total || W.loaded), z(), I)),
      ),
    )
      .then(([W, I]) => {
        t.current === L &&
          (L.setBumpMap(I),
          c.images.useImage && L.setClothImage(W),
          h(100),
          L.reveal(),
          y(!0),
          window.setTimeout(() => _(!0), 550));
      })
      .catch((W) => {
        (console.error("[haptique] asset load failed", W),
          t.current === L && (L.reveal(), y(!0), window.setTimeout(() => _(!0), 550)));
      });
    const G = new Map();
    let q = DialStore.getActivePresetId("haptique");
    const K = DialStore.subscribe("haptique", () => {
      const W = DialStore.getActivePresetId("haptique");
      if (W === q) return;
      G.set(q, L.snapshotImages());
      const I = G.get(W);
      (I && L.restoreImages(I), (q = W));
    });
    return () => {
      (K(), pattern.dispose(), L.dispose(), (patternEngineRef.current = null), (t.current = null));
    };
  }, []);
  React.useEffect(() => {
    patternEngineRef.current?.setState(patternState);
  }, [patternState]);
  const M = React.useRef(!0),
    E = c.material.preset,
    S = React.useRef(!0);
  React.useEffect(() => {
    if (S.current) {
      S.current = !1;
      return;
    }
    const L = MATERIAL_PRESETS[E];
    L &&
      (L.material.finish !== c.material.finish && (M.current = !0),
      l.setValues({ material: L.material, render: L.render }));
  }, [E]);
  const x = c.material.finish;
  (React.useEffect(() => {
    if (M.current) {
      M.current = !1;
      return;
    }
    const L = FINISH_PRESETS[x];
    L && l.setValues({ material: L });
  }, [x]),
    React.useEffect(() => {
      t.current?.applyParams(c);
    }));
  const w = t.current,
    A = w?.getClothThumbnail() ?? null,
    T = w?.getDecalThumbnails() ?? [],
    P = w?.getBumpThumbnail() ?? null,
    R = useButtonPortalTarget("Image as cloth…"),
    U = useButtonPortalTarget("Add image / SVG"),
    b = useButtonPortalTarget("Upload bump map");
  studioActionsRef.current = {
    exportFlatPattern: () => patternEngineRef.current?.exportFlatPattern(),
    exportCloth: () => t.current?.exportPNG(!1),
    exportClothClear: () => t.current?.exportPNG(!0),
    resetCloth: () => t.current?.resetCloth(patternState.seed),
    resetFlatCloth: () => t.current?.resetFlatCloth(),
  };
  return jsxs(Fragment, {
    children: [
      jsx("div", {
        id: "canvas-host",
        ref: n,
        style: { opacity: m ? 1 : 0, transition: "opacity 0.6s ease" },
      }),
      jsx("input", {
        ref: e,
        type: "file",
        accept: "image/*,.svg",
        style: { display: "none" },
        onChange: (L) => {
          const N = L.target.files?.[0];
          (N && readFileAsImage(N, (z) => t.current?.addDecal(z)), (L.target.value = ""));
        },
      }),
      jsx("input", {
        ref: s,
        type: "file",
        accept: "image/*,.svg",
        style: { display: "none" },
        onChange: (L) => {
          const N = L.target.files?.[0];
          (N &&
            readFileAsImage(N, (z) => {
              (t.current?.setClothImage(z), l.setValues({ images: { useImage: !0 } }));
            }),
            (L.target.value = ""));
        },
      }),
      jsx("input", {
        ref: r,
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        onChange: (L) => {
          const N = L.target.files?.[0];
          (N && readFileAsImage(N, (z) => t.current?.setBumpMap(z)), (L.target.value = ""));
        },
      }),
      jsx("input", {
        ref: rHDR,
        type: "file",
        accept: "image/*,.hdr,.exr",
        style: { display: "none" },
        onChange: async (L) => {
          const N = L.target.files?.[0];
          try {
            N && t.current?.setEnvironment(await readEnvironmentFile(N));
          } catch (z) {
            console.error("[haptique] environment load failed", z);
          }
          L.target.value = "";
        },
      }),
      R &&
        A &&
        createPortal(
          jsx(ImageThumbnail, {
            thumb: A,
            label: "Cloth image",
            onRemove: () => l.setValues({ images: { useImage: !1 } }),
          }),
          R,
        ),
      U &&
        T.length > 0 &&
        createPortal(
          jsx("div", {
            children: T.map((L, N) =>
              jsx(
                ImageThumbnail,
                { thumb: L, label: `Image ${N + 1}`, onRemove: () => t.current?.removeDecal(N) },
                N,
              ),
            ),
          }),
          U,
        ),
      b &&
        P &&
        createPortal(
          jsx(ImageThumbnail, { thumb: P, label: "Bump map", onRemove: () => t.current?.setBumpMap(null) }),
          b,
        ),
      !g && jsx(LoadingOverlay, { percent: d, hiding: m }),
    ],
  });
}

function HaptiqueApp() {
  const [patternState, setPatternState] = React.useState(createDefaultPatternState);
  const studioActionsRef = React.useRef(null);
  return jsx(OSShell, {
    preview: jsx(ClothExperience, { patternState, studioActionsRef }),
    studioState: patternState,
    onStudioStateChange: setPatternState,
    studioActionsRef,
  });
}

export { HaptiqueApp };
