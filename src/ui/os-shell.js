import * as React from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import QRCode from "qrcode";
import {
  Archive,
  ArrowRight,
  BookmarkPlus,
  Copy,
  Dices,
  Download,
  FileImage,
  FileText,
  Globe,
  Grid3X3,
  Hash,
  Info,
  Maximize2,
  Menu,
  Minimize2,
  Minus,
  MonitorPlay,
  Palette,
  QrCode,
  RotateCcw,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Shapes,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { SERIES, SERIES_BY_ID, getPalette } from "../pattern-studio/pattern-data.js";
import {
  applyPatternSnapshot,
  createPatternShareUrl,
  createPatternSnapshot,
  decodePatternShare,
  encodePatternShare,
} from "../pattern-studio/pattern-share.js";
import { useCuratedPatternPreviews } from "./curated-pattern-previews.js";

const COPY = {
  en: {
    tagline: "creative software for real things.",
    headline: ["MAKE SOMETHING", "THAT’S NEVER", "BEEN MADE"],
    features: ["algorithmic art", "soft goods", "made to order", "1of1 or 1toMany"],
    openStudio: "OPEN STUDIO",
    start: "START",
    local: "LOCAL",
    soundOn: "Sound on",
    soundOff: "Sound off",
  },
  fr: {
    tagline: "logiciel créatif pour objets réels.",
    headline: ["CRÉEZ QUELQUE", "CHOSE QUI N’A", "JAMAIS EXISTÉ"],
    features: ["art algorithmique", "objets souples", "fabriqué à la demande", "1sur1 ou 1àPlusieurs"],
    openStudio: "OUVRIR LE STUDIO",
    start: "DÉMARRER",
    local: "LOCAL",
    soundOn: "Son activé",
    soundOff: "Son désactivé",
  },
};

const APP_LINKS = [
  ["studio", "STUDIO"],
  ["shop", "SHOP"],
  ["archive", "ARCHIVE"],
  ["about", "ABOUT"],
];

const APP_ICONS = {
  studio: Sparkles,
  shop: ShoppingBag,
  archive: Archive,
  about: Info,
};

const WINDOW_ICONS = {
  welcome: FileText,
  preview: MonitorPlay,
  series: Grid3X3,
  shopSeries: ShoppingBag,
  curated: Grid3X3,
  irl: FileImage,
  seed: Hash,
  palette: Palette,
  attributes: Settings2,
  export: Download,
};

function AppGlyph({ id, size = 14 }) {
  const Icon = APP_ICONS[id] || WINDOW_ICONS[id] || FileText;
  return jsx(Icon, { size, strokeWidth: 1.8, "aria-hidden": "true" });
}

function useLocalClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return {
    time: new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(now),
    date: new Intl.DateTimeFormat([], { month: "short", day: "2-digit" }).format(now).toUpperCase(),
  };
}

function useAmbientSound() {
  const audioRef = React.useRef(null);
  const [enabled, setEnabled] = React.useState(false);

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.gain.gain.cancelScheduledValues(audio.context.currentTime);
    audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.04);
    window.setTimeout(() => audio.context.close(), 180);
    audioRef.current = null;
  }, []);

  const toggle = React.useCallback(async () => {
    if (audioRef.current) {
      stop();
      setEnabled(false);
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const low = context.createOscillator();
    const high = context.createOscillator();
    gain.gain.value = 0;
    filter.type = "lowpass";
    filter.frequency.value = 340;
    low.type = "sine";
    low.frequency.value = 55;
    high.type = "triangle";
    high.frequency.value = 82.5;
    low.connect(filter);
    high.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    low.start();
    high.start();
    gain.gain.setTargetAtTime(0.018, context.currentTime, 0.25);
    audioRef.current = { context, gain, low, high };
    await context.resume();
    setEnabled(true);
  }, [stop]);

  React.useEffect(() => stop, [stop]);
  return { enabled, toggle };
}

function Brand({ onHome }) {
  return jsxs("a", {
    className: "brand",
    href: "#home",
    onClick: onHome,
    "aria-label": "Haptique home",
    children: [
      jsx("span", { className: "brand-mark", "aria-hidden": "true" }),
      jsx("span", { children: "HAPTIQUE" }),
      jsx("sup", { children: "TM" }),
    ],
  });
}

function CartIcon() {
  return jsx(ShoppingCart, { className: "cart-icon", size: 19, strokeWidth: 1.8, "aria-hidden": "true" });
}

function SiteHeader({ copy, cartCount, menuOpen, onMenuToggle, onMenuClose, onOpenStudio, onOpenShop, onHome }) {
  return jsxs("header", {
    className: "site-header",
    children: [
      jsx("button", {
        className: "mobile-menu-button",
        type: "button",
        onClick: onMenuToggle,
        "aria-expanded": menuOpen,
        "aria-label": "Toggle navigation",
        children: menuOpen
          ? jsx(X, { size: 21, strokeWidth: 1.8, "aria-hidden": "true" })
          : jsx(Menu, { size: 21, strokeWidth: 1.8, "aria-hidden": "true" }),
      }),
      jsx(Brand, { onHome }),
      jsx("p", { className: "brand-tagline", children: copy.tagline }),
      jsx("nav", {
        className: menuOpen ? "primary-nav is-open" : "primary-nav",
        "aria-label": "Primary navigation",
        children: APP_LINKS.map(([id, label]) =>
          jsx("a", {
            href: `#${id}`,
            onClick: () => {
              if (id === "studio") onOpenStudio();
              if (id === "shop") onOpenShop();
              onMenuClose();
            },
            children: label,
          }, id),
        ),
      }),
      jsx("a", {
        className: "cart-button",
        href: "#cart",
        "aria-label": `Open shopping cart, ${cartCount} items`,
        children: jsxs(React.Fragment, {
          children: [jsx(CartIcon, {}), jsx("span", { children: String(cartCount).padStart(2, "0") })],
        }),
      }),
    ],
  });
}

function WindowButton({ label, glyph, onClick }) {
  return jsx("button", {
    type: "button",
    className: "window-button",
    onPointerDown: (event) => event.stopPropagation(),
    onClick,
    "aria-label": label,
    children: glyph,
  });
}

function OSWindow({
  id,
  title,
  className = "",
  status,
  active,
  maximized = false,
  onFocus,
  onMinimize,
  onClose,
  onMaximize,
  resetPositionKey,
  children,
}) {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [recentering, setRecentering] = React.useState(false);
  const dragRef = React.useRef(null);
  const previousResetKey = React.useRef(resetPositionKey);
  const TitleIcon = WINDOW_ICONS[id] || FileText;

  React.useEffect(() => {
    if (resetPositionKey === undefined || resetPositionKey === previousResetKey.current) return;
    previousResetKey.current = resetPositionKey;
    setRecentering(true);
    const frame = window.requestAnimationFrame(() => setOffset({ x: 0, y: 0 }));
    const timer = window.setTimeout(() => setRecentering(false), 230);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [resetPositionKey]);

  const correctedDrag = (event) => {
    const start = dragRef.current;
    if (!start) return;
    setOffset({
      x: Math.round(start.x + event.clientX - start.pointerX),
      y: Math.round(start.y + event.clientY - start.pointerY),
    });
  };
  const startDrag = (event) => {
    if (maximized || event.button !== 0 || window.matchMedia("(max-width: 760px)").matches) return;
    onFocus();
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: offset.x, y: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  return jsxs("section", {
    className: `os-window ${className} ${active ? "is-active" : ""} ${maximized ? "is-maximized" : ""} ${recentering ? "is-recentering" : ""} is-${status} ${status !== "open" ? "is-hidden" : ""}`,
    style: maximized || (offset.x === 0 && offset.y === 0)
      ? undefined
      : { transform: `translate(${offset.x}px, ${offset.y}px)` },
    onPointerDown: onFocus,
    "data-window-id": id,
    "aria-hidden": status !== "open",
    inert: status !== "open",
    children: [
      jsxs("div", {
        className: "window-titlebar",
        onPointerDown: startDrag,
        onPointerMove: correctedDrag,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        onDoubleClick: onMaximize,
        children: [
          jsxs("div", {
            className: "window-title",
            children: [jsx(TitleIcon, { size: 13, strokeWidth: 1.8, "aria-hidden": "true" }), title],
          }),
          jsxs("div", {
            className: "window-actions",
            children: [
              jsx(WindowButton, {
                label: `Minimize ${title}`,
                glyph: jsx(Minus, { size: 14, strokeWidth: 1.8, "aria-hidden": "true" }),
                onClick: onMinimize,
              }),
              onMaximize &&
                jsx(WindowButton, {
                  label: maximized ? `Restore ${title}` : `Maximize ${title}`,
                  glyph: maximized
                    ? jsx(Minimize2, { size: 13, strokeWidth: 1.8, "aria-hidden": "true" })
                    : jsx(Maximize2, { size: 13, strokeWidth: 1.8, "aria-hidden": "true" }),
                  onClick: onMaximize,
                }),
              jsx(WindowButton, {
                label: `Close ${title}`,
                glyph: jsx(X, { size: 14, strokeWidth: 1.8, "aria-hidden": "true" }),
                onClick: onClose,
              }),
            ],
          }),
        ],
      }),
      children,
    ],
  });
}

function WelcomeWindow({ copy, onOpenStudio, ...windowProps }) {
  return jsx(OSWindow, {
    ...windowProps,
    id: "welcome",
    title: "WELCOME.TXT",
    className: "welcome-window",
    children: jsxs("div", {
      className: "welcome-content",
      children: [
        jsx("p", { className: "eyebrow", children: "HAPTIQUE / 001" }),
        jsxs("h1", {
          children: [
            copy.headline.map((line) => jsx("span", { children: line }, line)),
            jsx("i", { "aria-hidden": "true", children: jsx(Sparkles, { size: 18, strokeWidth: 1.8 }) }),
          ],
        }),
        jsx("ul", {
          className: "feature-list",
          children: copy.features.map((feature) => jsx("li", { children: `// ${feature}` }, feature)),
        }),
        jsxs("a", {
          className: "primary-button",
          href: "#studio",
          onClick: onOpenStudio,
          children: [jsx(ArrowRight, { size: 16, strokeWidth: 1.8, "aria-hidden": "true" }), copy.openStudio],
        }),
      ],
    }),
  });
}

function PreviewWindow({ preview, previewZoom, workspaceMode, studioState, actionsRef, ...windowProps }) {
  return jsx(OSWindow, {
    ...windowProps,
    id: "preview",
    title: "PREVIEW.EXE",
    className: "preview-window",
    children: jsxs("div", {
      className: "preview-content",
      children: [
        jsxs("div", {
          className: "cloth-viewport",
          children: [
            preview,
            workspaceMode !== "home" &&
              jsxs("div", {
                className: "studio-preview-badge",
                children: [
                  jsx("span", { children: studioState.seriesId.toUpperCase() }),
                  jsx("b", { children: SERIES_BY_ID[studioState.seriesId].name }),
                  jsx("i", { children: `SEED ${String(studioState.seed).padStart(6, "0")}` }),
                  workspaceMode !== "home" &&
                    jsxs("div", {
                      className: "preview-cloth-actions",
                      children: [
                        jsxs("button", {
                          type: "button",
                          onClick: () => actionsRef.current?.resetCloth(),
                          children: [jsx(RotateCcw, { size: 10, strokeWidth: 1.8, "aria-hidden": "true" }), "RESET CLOTH"],
                        }),
                        jsxs("button", {
                          type: "button",
                          onClick: () => actionsRef.current?.resetFlatCloth(),
                          children: [jsx(Minimize2, { size: 10, strokeWidth: 1.8, "aria-hidden": "true" }), "FLAT CLOTH"],
                        }),
                      ],
                    }),
                ],
              }),
          ],
        }),
        jsxs("div", {
          className: "preview-statusbar",
          children: [
            jsx("span", { children: "LIVE CLOTH / WEBGL" }),
            jsx("span", { children: "DRAG TO MOVE · SCROLL TO ZOOM" }),
            jsxs("span", {
              className: "preview-zoom",
              "aria-label": `Zoom ${previewZoom}%`,
              children: [
                jsx("i", { "aria-hidden": "true", children: jsx("b", { style: { width: `${previewZoom}%` } }) }),
                jsx("output", { children: `${previewZoom}%` }),
              ],
            }),
          ],
        }),
      ],
    }),
  });
}

function StudioField({ label, children, className = "" }) {
  return jsxs("label", {
    className: `studio-field ${className}`,
    children: [jsx("span", { children: label }), children],
  });
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function StudioWorkspace({
  state,
  onStateChange,
  actionsRef,
  windows,
  active,
  onFocus,
  onMinimize,
  onClose,
}) {
  const series = SERIES_BY_ID[state.seriesId];
  const palette = getPalette(state);
  const paletteIndex = state.paletteIndexesBySeriesId[state.seriesId];
  const parameters = state.parametersBySeriesId[state.seriesId];
  const [products, setProducts] = React.useState([
    { id: "blankets", displayName: "Woven Blanket" },
  ]);
  const [productId, setProductId] = React.useState("blankets");
  const shareCode = React.useMemo(
    () => encodePatternShare(createPatternSnapshot(state)),
    [state],
  );
  const shareUrl = React.useMemo(() => createPatternShareUrl(shareCode), [shareCode]);
  const [savedDesigns, setSavedDesigns] = React.useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("haptique.savedDesigns") || "[]");
      if (Array.isArray(saved) && saved.length) return saved.filter((item) => typeof item === "string");
      const legacySeeds = JSON.parse(window.localStorage.getItem("haptique.savedSeeds") || "[]");
      return Array.isArray(legacySeeds)
        ? legacySeeds.slice(0, 5).map((seed) =>
            encodePatternShare(createPatternSnapshot({ ...state, seed: Number(seed) || 0 })),
          )
        : [];
    } catch {
      return [];
    }
  });
  const [shareInput, setShareInput] = React.useState("");
  const [shareStatus, setShareStatus] = React.useState("");
  const [showQr, setShowQr] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    fetch("./textures/curated/catalog.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((catalog) => {
        if (cancelled || !Array.isArray(catalog.products)) return;
        const enabledProducts = catalog.products.filter((product) => product.enabled !== false);
        if (!enabledProducts.length) return;
        setProducts(enabledProducts);
        setProductId((current) => enabledProducts.some((product) => product.id === current)
          ? current
          : (catalog.defaultProductId || enabledProducts[0].id));
      })
      .catch((error) => console.error("[haptique] product catalog failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!showQr) return undefined;
    let cancelled = false;
    setQrDataUrl("");
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0e0e0e", light: "#f8f5ef" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setShareStatus("QR generation failed");
      });
    return () => {
      cancelled = true;
    };
  }, [showQr, shareUrl]);

  const savedDesignDetails = React.useMemo(
    () => savedDesigns.flatMap((code) => {
      try {
        const snapshot = decodePatternShare(code);
        return snapshot.version === 1 ? [{ code, snapshot }] : [];
      } catch {
        return [];
      }
    }),
    [savedDesigns],
  );

  const update = (patch) => onStateChange({ ...state, ...patch });
  const updateSeed = (value) => update({ seed: Math.max(0, Math.min(999999, Math.round(Number(value) || 0))) });
  const choosePalette = (index) => {
    const next = series.palettes[index];
    onStateChange({
      ...state,
      paletteIndexesBySeriesId: { ...state.paletteIndexesBySeriesId, [state.seriesId]: index },
      paletteValuesBySeriesId: {
        ...state.paletteValuesBySeriesId,
        [state.seriesId]: { bg: next.bg, colors: [...next.colors] },
      },
    });
  };
  const updateColor = (index, color) => {
    const nextPalette = { ...palette, colors: [...palette.colors] };
    if (index < 0) nextPalette.bg = color;
    else nextPalette.colors[index] = color;
    onStateChange({
      ...state,
      paletteValuesBySeriesId: {
        ...state.paletteValuesBySeriesId,
        [state.seriesId]: { bg: nextPalette.bg, colors: nextPalette.colors },
      },
    });
  };
  const updateParameter = (key, value) => {
    onStateChange({
      ...state,
      parametersBySeriesId: {
        ...state.parametersBySeriesId,
        [state.seriesId]: { ...parameters, [key]: value },
      },
    });
  };
  const applySharedDesign = (snapshot, message = "DESIGN LOADED") => {
    onStateChange(applyPatternSnapshot(state, snapshot));
    setShareStatus(message);
  };
  const saveDesign = () => {
    const next = [shareCode, ...savedDesigns.filter((code) => code !== shareCode)].slice(0, 5);
    setSavedDesigns(next);
    window.localStorage.setItem("haptique.savedDesigns", JSON.stringify(next));
    setShareStatus("DESIGN SAVED");
  };
  const copyShareHash = async () => {
    try {
      await copyText(shareCode);
      setShareStatus("HASH COPIED");
    } catch {
      setShareStatus("COPY FAILED");
    }
  };
  const importSharedDesign = () => {
    try {
      applySharedDesign(decodePatternShare(shareInput));
      setShareInput("");
    } catch (error) {
      setShareStatus(error.message);
    }
  };
  const windowProps = (id, title, className) => ({
    id,
    title,
    className: `studio-tool-window ${className}`,
    status: windows[id],
    active: active === id,
    onFocus: () => onFocus(id),
    onMinimize: () => onMinimize(id),
    onClose: () => onClose(id),
  });

  return jsxs(React.Fragment, {
    children: [
      jsx(OSWindow, {
        ...windowProps("series", "SERIES.SELECT", "series-window"),
        children: jsxs("div", {
          className: "studio-panel-content",
          children: [
            jsx("p", { className: "panel-index", children: "01 / GENERATOR FAMILY" }),
            jsx(StudioField, {
              label: "PRODUCT TYPE",
              children: jsx("select", {
                value: productId,
                onChange: (event) => setProductId(event.target.value),
                children: products.map((product) =>
                  jsx("option", { value: product.id, children: product.displayName }, product.id),
                ),
              }),
            }),
            jsx(StudioField, {
              label: "ACTIVE SERIES",
              children: jsx("select", {
                value: state.seriesId,
                onChange: (event) => update({ seriesId: event.target.value }),
                children: SERIES.map((item) =>
                  jsx("option", { value: item.id, children: `${item.id.toUpperCase()} — ${item.name}` }, item.id),
                ),
              }),
            }),
            jsxs("div", {
              className: "series-readout",
              children: [
                jsx("strong", { children: series.id.toUpperCase() }),
                jsxs("span", { children: [jsx("b", { children: series.name }), series.note] }),
              ],
            }),
            jsx("div", {
              className: "series-ticks",
              children: SERIES.map((item) =>
                jsx("button", {
                  type: "button",
                  className: item.id === state.seriesId ? "is-active" : "",
                  onClick: () => update({ seriesId: item.id }),
                  "aria-label": `Select ${item.name}`,
                  children: item.id.slice(-2),
                }, item.id),
              ),
            }),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("seed", "SEED.EXE", "seed-window"),
        children: jsxs("div", {
          className: "studio-panel-content seed-panel",
          children: [
            jsx("p", { className: "panel-index", children: "02 / UNIQUE INPUT" }),
            jsx(StudioField, {
              label: "SEED NUMBER",
              children: jsx("input", {
                type: "number",
                min: "0",
                max: "999999",
                value: state.seed,
                onChange: (event) => updateSeed(event.target.value),
              }),
            }),
            jsxs("div", {
              className: "button-pair",
              children: [
                jsxs("button", {
                  type: "button",
                  className: "panel-button is-accent",
                  onClick: () => updateSeed(Math.floor(Math.random() * 1000000)),
                  children: [jsx(Dices, { size: 12, strokeWidth: 1.8, "aria-hidden": "true" }), "RANDOMIZE"],
                }),
                jsxs("button", {
                  type: "button",
                  className: "panel-button",
                  onClick: saveDesign,
                  children: [jsx(BookmarkPlus, { size: 12, strokeWidth: 1.8, "aria-hidden": "true" }), "SAVE"],
                }),
              ],
            }),
            savedDesignDetails.length > 0 &&
              jsxs("div", {
                className: "saved-seeds",
                children: [
                  jsx("span", { children: "SAVED DESIGNS" }),
                  jsx("div", {
                    children: savedDesignDetails.map(({ code, snapshot }) =>
                      jsxs("button", {
                        type: "button",
                        className: "saved-design",
                        onClick: () => applySharedDesign(snapshot),
                        title: `Load ${snapshot.seriesId.toUpperCase()} seed ${snapshot.seed}`,
                        children: [
                          jsx("b", { children: snapshot.seriesId.toUpperCase() }),
                          jsx("span", { children: `#${String(snapshot.seed).padStart(6, "0")}` }),
                          jsx("i", {
                            className: "saved-design-colors",
                            "aria-label": "Saved colors",
                            children: [snapshot.palette.bg, ...snapshot.palette.colors].map((color, index) =>
                              jsx("em", { style: { backgroundColor: color } }, `${color}-${index}`),
                            ),
                          }),
                        ],
                      }, code),
                    ),
                  }),
                ],
              }),
            jsxs("div", {
              className: "share-design",
              children: [
                jsx("span", { children: "SHARE / RESTORE" }),
                jsxs("div", {
                  className: "share-actions",
                  children: [
                    jsxs("button", {
                      type: "button",
                      onClick: copyShareHash,
                      children: [jsx(Copy, { size: 11, strokeWidth: 1.8, "aria-hidden": "true" }), "COPY HASH"],
                    }),
                    jsxs("button", {
                      type: "button",
                      className: showQr ? "is-active" : "",
                      onClick: () => setShowQr((value) => !value),
                      children: [jsx(QrCode, { size: 11, strokeWidth: 1.8, "aria-hidden": "true" }), "QR CODE"],
                    }),
                  ],
                }),
                showQr &&
                  jsx("div", {
                    className: "share-qr",
                    children: qrDataUrl
                      ? jsx("img", { src: qrDataUrl, alt: `QR code for ${series.name} seed ${state.seed}` })
                      : jsx("span", { children: "GENERATING QR..." }),
                  }),
                jsxs("div", {
                  className: "share-import",
                  children: [
                    jsx("input", {
                      type: "text",
                      value: shareInput,
                      onChange: (event) => setShareInput(event.target.value),
                      onKeyDown: (event) => {
                        if (event.key === "Enter") importSharedDesign();
                      },
                      placeholder: "PASTE HASH OR LINK",
                      "aria-label": "Paste a design hash or share link",
                    }),
                    jsx("button", { type: "button", onClick: importSharedDesign, children: "LOAD" }),
                  ],
                }),
                shareStatus && jsx("output", { className: "share-status", children: shareStatus }),
              ],
            }),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("palette", "PALETTE.DAT", "palette-window"),
        children: jsxs("div", {
          className: "studio-panel-content",
          children: [
            jsx("p", { className: "panel-index", children: "03 / COLOR SYSTEM" }),
            jsx(StudioField, {
              label: "PALETTE PRESET",
              children: jsx("select", {
                value: paletteIndex,
                onChange: (event) => choosePalette(Number(event.target.value)),
                children: series.palettes.map((item, index) =>
                  jsx("option", { value: index, children: item.name }, item.name),
                ),
              }),
            }),
            jsxs("div", {
              className: "color-grid",
              children: [
                jsx(StudioField, {
                  label: "GROUND",
                  className: "color-field",
                  children: jsx("input", { type: "color", value: palette.bg, onChange: (event) => updateColor(-1, event.target.value) }),
                }),
                palette.colors.map((color, index) =>
                  jsx(StudioField, {
                    label: `INK ${String(index + 1).padStart(2, "0")}`,
                    className: "color-field",
                    children: jsx("input", { type: "color", value: color, onChange: (event) => updateColor(index, event.target.value) }),
                  }, `${index}-${color}`),
                ),
              ],
            }),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("attributes", "ATTRIBUTES.CFG", "attributes-window"),
        children: jsxs("div", {
          className: "studio-panel-content attributes-panel",
          children: [
            jsx("p", { className: "panel-index", children: "04 / SERIES ATTRIBUTES" }),
            series.parameters.map((parameter) =>
              parameter.options
                ? jsx(StudioField, {
                    label: parameter.label,
                    children: jsx("select", {
                      value: parameters[parameter.key],
                      onChange: (event) => updateParameter(parameter.key, event.target.value),
                      children: parameter.options.map((option) => jsx("option", { value: option, children: option }, option)),
                    }),
                  }, parameter.key)
                : jsxs("label", {
                    className: "range-field",
                    children: [
                      jsxs("span", { children: [parameter.label, jsx("output", { children: parameters[parameter.key] })] }),
                      jsx("input", {
                        type: "range",
                        min: parameter.min,
                        max: parameter.max,
                        step: parameter.step,
                        value: parameters[parameter.key],
                        onChange: (event) => updateParameter(parameter.key, Number(event.target.value)),
                      }),
                    ],
                  }, parameter.key),
            ),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("export", "EXPORT.ORDER", "export-window"),
        children: jsxs("div", {
          className: "studio-panel-content export-panel",
          children: [
            jsx("p", { className: "panel-index", children: "05 / SAVE + CONTINUE" }),
            jsxs("div", {
              className: "export-grid",
              children: [
                jsxs("button", {
                  type: "button",
                  onClick: () => actionsRef.current?.exportFlatPattern(),
                  children: [jsx(Download, { size: 11, strokeWidth: 1.8, "aria-hidden": "true" }), "FLAT PNG"],
                }),
                jsxs("button", {
                  type: "button",
                  onClick: () => actionsRef.current?.exportCloth(),
                  children: [jsx(FileImage, { size: 11, strokeWidth: 1.8, "aria-hidden": "true" }), "3D PNG"],
                }),
              ],
            }),
            jsxs("a", {
              className: "continue-button",
              href: "#order",
              children: [jsx("span", { children: "CONTINUE TO ORDER" }), jsx(ArrowRight, { size: 16, strokeWidth: 1.8, "aria-hidden": "true" })],
            }),
          ],
        }),
      }),
    ],
  });
}

function randomParameterValue(parameter) {
  if (parameter.options) {
    return parameter.options[Math.floor(Math.random() * parameter.options.length)];
  }
  const steps = Math.round((parameter.max - parameter.min) / parameter.step);
  const value = parameter.min + Math.floor(Math.random() * (steps + 1)) * parameter.step;
  const precision = Math.max(0, (String(parameter.step).split(".")[1] || "").length);
  return Number(value.toFixed(precision));
}

function ShopWorkspace({
  state,
  onStateChange,
  windows,
  active,
  onFocus,
  onMinimize,
  onClose,
  onAddToCart,
}) {
  const fallbackProducts = React.useMemo(() => [
    {
      id: "blankets",
      name: "Blanket",
      displayName: "Woven Blanket",
      manifestPath: "./textures/curated/blankets/curated_list.json",
      enabled: true,
    },
  ], []);
  const [products, setProducts] = React.useState(fallbackProducts);
  const [productId, setProductId] = React.useState("blankets");
  const [items, setItems] = React.useState([]);
  const [randomItem, setRandomItem] = React.useState(null);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [catalogStatus, setCatalogStatus] = React.useState("LOADING CURATED EDITIONS...");
  const [cartStatus, setCartStatus] = React.useState("");
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const previewItems = React.useMemo(
    () => randomItem ? [...items, randomItem] : items,
    [items, randomItem],
  );
  const previews = useCuratedPatternPreviews(previewItems);
  const currentProduct = products.find((product) => product.id === productId) || products[0];
  const selectedPreview = selectedItem ? previews[selectedItem.id] : null;

  const selectItem = React.useCallback((item) => {
    try {
      const snapshot = decodePatternShare(item.hash);
      onStateChange(applyPatternSnapshot(stateRef.current, snapshot));
      setSelectedItem(item);
      setRandomItem(null);
      setCartStatus("");
    } catch (error) {
      setCatalogStatus(error.message);
    }
  }, [onStateChange]);

  React.useEffect(() => {
    let cancelled = false;
    fetch("./textures/curated/catalog.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((catalog) => {
        if (cancelled || !Array.isArray(catalog.products) || !catalog.products.length) return;
        const enabledProducts = catalog.products.filter((product) => product.enabled !== false);
        if (!enabledProducts.length) return;
        setProducts(enabledProducts);
        setProductId((current) => enabledProducts.some((product) => product.id === current)
          ? current
          : (catalog.defaultProductId || enabledProducts[0].id));
      })
      .catch((error) => console.error("[haptique] curated catalog failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!currentProduct) return undefined;
    let cancelled = false;
    setItems([]);
    setRandomItem(null);
    setSelectedItem(null);
    setCatalogStatus("LOADING CURATED EDITIONS...");
    const path = currentProduct.manifestPath.replace("{seriesId}", state.seriesId);
    fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((manifest) => {
        if (cancelled) return;
        const seriesItems = manifest.series?.[state.seriesId];
        const nextItems = Array.isArray(seriesItems)
          ? seriesItems.slice(0, 12)
          : Array.isArray(manifest.items)
            ? manifest.items.slice(0, 12)
            : [];
        setItems(nextItems);
        setCatalogStatus(nextItems.length ? "" : "NO CURATED EDITIONS FOUND");
        if (nextItems[0]) selectItem(nextItems[0]);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[haptique] curated manifest failed", error);
        setCatalogStatus("CURATED LIST UNAVAILABLE");
      });
    return () => {
      cancelled = true;
    };
  }, [currentProduct, selectItem, state.seriesId]);

  const chooseSeries = (seriesId) => {
    onStateChange({ ...stateRef.current, seriesId });
    setCartStatus("");
  };
  const generateRandom = () => {
    const series = SERIES_BY_ID[state.seriesId];
    const paletteIndex = Math.floor(Math.random() * series.palettes.length);
    const palette = series.palettes[paletteIndex];
    const nextState = {
      ...state,
      seed: Math.floor(Math.random() * 1000000),
      paletteIndexesBySeriesId: {
        ...state.paletteIndexesBySeriesId,
        [state.seriesId]: paletteIndex,
      },
      paletteValuesBySeriesId: {
        ...state.paletteValuesBySeriesId,
        [state.seriesId]: { bg: palette.bg, colors: [...palette.colors] },
      },
      parametersBySeriesId: {
        ...state.parametersBySeriesId,
        [state.seriesId]: Object.fromEntries(
          series.parameters.map((parameter) => [parameter.key, randomParameterValue(parameter)]),
        ),
      },
    };
    const item = {
      id: `random-${state.seriesId}-${nextState.seed}`,
      name: "Random generation",
      hash: encodePatternShare(createPatternSnapshot(nextState)),
    };
    onStateChange(nextState);
    setRandomItem(item);
    setSelectedItem(item);
    setCartStatus("");
  };
  const addSelectedToCart = () => {
    if (!selectedItem || !currentProduct) return;
    onAddToCart({
      productId: currentProduct.id,
      productName: currentProduct.displayName,
      seriesId: state.seriesId,
      designName: selectedItem.name,
      designHash: selectedItem.hash,
    });
    setCartStatus("ADDED TO CART");
  };
  const windowProps = (id, title, className) => ({
    id,
    title,
    className: `shop-tool-window ${className}`,
    status: windows[id],
    active: active === id,
    onFocus: () => onFocus(id),
    onMinimize: () => onMinimize(id),
    onClose: () => onClose(id),
  });

  return jsxs(React.Fragment, {
    children: [
      jsx(OSWindow, {
        ...windowProps("curated", "CURATED.EXE", "curated-window"),
        children: jsxs("div", {
          className: "curated-panel",
          children: [
            jsxs("div", {
              className: "curated-heading",
              children: [
                jsxs("span", { children: [SERIES_BY_ID[state.seriesId].name, " / ", currentProduct?.displayName || "Product"] }),
                jsx("b", { children: "12 SELECTED EDITIONS" }),
              ],
            }),
            catalogStatus && jsx("div", { className: "curated-status", children: catalogStatus }),
            jsx("div", {
              className: "curated-grid",
              children: items.map((item, index) =>
                jsxs("button", {
                  type: "button",
                  className: selectedItem?.id === item.id ? "curated-card is-selected" : "curated-card",
                  onClick: () => selectItem(item),
                  "aria-pressed": selectedItem?.id === item.id,
                  children: [
                    jsx("span", {
                      className: previews[item.id] ? "curated-card-media is-ready" : "curated-card-media",
                      children: previews[item.id]
                        ? jsx("img", { src: previews[item.id], alt: "" })
                        : jsx("i", { children: "RENDERING" }),
                    }),
                    jsxs("span", {
                      className: "curated-card-meta",
                      children: [
                        jsx("b", { children: String(index + 1).padStart(2, "0") }),
                        jsx("span", { children: item.name }),
                      ],
                    }),
                  ],
                }, item.id),
              ),
            }),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("shopSeries", "SHOP.SELECT", "shop-series-window"),
        children: jsxs("div", {
          className: "shop-select-panel",
          children: [
            jsx(StudioField, {
              label: "PRODUCT TYPE",
              children: jsx("select", {
                value: productId,
                onChange: (event) => setProductId(event.target.value),
                children: products.map((product) =>
                  jsx("option", { value: product.id, children: product.displayName }, product.id),
                ),
              }),
            }),
            jsx(StudioField, {
              label: "SERIES",
              children: jsx("select", {
                value: state.seriesId,
                onChange: (event) => chooseSeries(event.target.value),
                children: SERIES.map((series) =>
                  jsx("option", { value: series.id, children: `${series.id.toUpperCase()} — ${series.name}` }, series.id),
                ),
              }),
            }),
            jsxs("button", {
              type: "button",
              className: "random-shop-button",
              onClick: generateRandom,
              children: [jsx(Dices, { size: 14, strokeWidth: 1.8, "aria-hidden": "true" }), "RANDOM GENERATE"],
            }),
          ],
        }),
      }),
      jsx(OSWindow, {
        ...windowProps("irl", "IRL.EXE", "irl-window"),
        children: jsxs("div", {
          className: "irl-panel",
          children: [
            jsxs("div", {
              className: "irl-heading",
              children: [jsx("span", { children: "PRODUCT IMAGE / 01" }), jsx("b", { children: "IRL ASSET SLOT" })],
            }),
            jsx("div", {
              className: "irl-stage",
              children: selectedPreview
                ? jsxs("div", {
                    className: "irl-blanket",
                    children: [jsx("img", { src: selectedPreview, alt: "Selected blanket pattern preview" }), jsx("span", { "aria-hidden": "true" })],
                  })
                : jsx("span", { className: "irl-empty", children: "SELECT AN EDITION" }),
            }),
            jsxs("div", {
              className: "irl-selection",
              children: [
                jsx("span", { children: currentProduct?.displayName || "PRODUCT" }),
                jsx("b", { children: selectedItem?.name || "NO DESIGN SELECTED" }),
                jsx("i", { children: `${state.seriesId.toUpperCase()} / SEED ${String(state.seed).padStart(6, "0")}` }),
              ],
            }),
            jsxs("button", {
              type: "button",
              className: "add-cart-button",
              disabled: !selectedItem,
              onClick: addSelectedToCart,
              children: [
                jsx(ShoppingCart, { size: 15, strokeWidth: 1.8, "aria-hidden": "true" }),
                jsx("span", { children: cartStatus || "ADD TO CART" }),
                jsx(ArrowRight, { size: 15, strokeWidth: 1.8, "aria-hidden": "true" }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}

function StartMenu({ open, onOpenWindow, onOpenStudio, onOpenShop }) {
  if (!open) return null;
  return jsxs("div", {
    className: "start-menu",
    role: "menu",
    children: [
      jsxs("div", {
        className: "start-menu-rail",
        children: [jsx("span", { children: "HAPTIQUE" }), jsx("b", { children: "OS" })],
      }),
      jsxs("div", {
        className: "start-menu-content",
        children: [
          jsx("p", { children: "APPLICATIONS" }),
          APP_LINKS.map(([id, label]) =>
            jsxs(
              "a",
              {
                className: "start-app",
                href: `#${id}`,
                role: "menuitem",
                onClick: id === "studio" ? onOpenStudio : id === "shop" ? onOpenShop : undefined,
                children: [jsx("span", { className: "start-app-icon", children: jsx(AppGlyph, { id, size: 14 }) }), jsx("b", { children: label }), jsx(ArrowRight, { size: 13, strokeWidth: 1.8, "aria-hidden": "true" })],
              },
              id,
            ),
          ),
          jsx("div", { className: "start-divider" }),
          jsx("button", { type: "button", onClick: () => onOpenWindow("welcome"), children: "WELCOME.TXT" }),
          jsx("button", { type: "button", onClick: () => onOpenWindow("preview"), children: "PREVIEW.EXE" }),
        ],
      }),
    ],
  });
}

const WINDOW_LABELS = {
  welcome: "WELCOME.TXT",
  preview: "PREVIEW.EXE",
  series: "SERIES.SELECT",
  shopSeries: "SHOP.SELECT",
  curated: "CURATED.EXE",
  irl: "IRL.EXE",
  seed: "SEED.EXE",
  palette: "PALETTE.DAT",
  attributes: "ATTRIBUTES.CFG",
  export: "EXPORT.ORDER",
};

function Taskbar({ copy, windows, active, clock, locale, sound, startOpen, onStart, onRestore, onTaskWindow, onLocale, onOpenStudio, onOpenShop }) {
  return jsxs("footer", {
    className: "taskbar",
    children: [
      jsx(StartMenu, { open: startOpen, onOpenWindow: onRestore, onOpenStudio, onOpenShop }),
      jsxs("button", {
        type: "button",
        className: startOpen ? "start-button is-active" : "start-button",
        onClick: onStart,
        "aria-expanded": startOpen,
        children: [jsx("span", { className: "start-mark", children: jsx(Shapes, { size: 14, strokeWidth: 1.8, "aria-hidden": "true" }) }), copy.start],
      }),
      jsx("div", { className: "taskbar-divider" }),
      jsx("div", {
        className: "running-apps",
        "aria-label": "Open applications",
        children: Object.entries(windows)
          .filter(([, status]) => status !== "closed")
          .map(([id, status]) =>
            jsxs(
              "button",
              {
                type: "button",
                className: `${active === id && status === "open" ? "is-active" : ""} ${status === "minimized" ? "is-minimized" : ""}`,
                onClick: () => onTaskWindow(id),
                children: [jsx("span", { className: "task-app-icon", children: jsx(AppGlyph, { id, size: 12 }) }), WINDOW_LABELS[id]],
              },
              id,
            ),
          ),
      }),
      jsxs("div", {
        className: "system-tray",
        children: [
          jsx("button", {
            type: "button",
            className: sound.enabled ? "sound-toggle is-active" : "sound-toggle",
            onClick: sound.toggle,
            "aria-label": sound.enabled ? copy.soundOn : copy.soundOff,
            "aria-pressed": sound.enabled,
            children: sound.enabled
              ? jsx(Volume2, { size: 15, strokeWidth: 1.8, "aria-hidden": "true" })
              : jsx(VolumeX, { size: 15, strokeWidth: 1.8, "aria-hidden": "true" }),
          }),
          jsxs("button", {
            type: "button",
            className: "language-toggle",
            onClick: onLocale,
            "aria-label": `Change language. Current language ${locale.toUpperCase()}`,
            children: [jsx(Globe, { size: 15, strokeWidth: 1.8, "aria-hidden": "true" }), locale.toUpperCase()],
          }),
          jsxs("div", {
            className: "clock",
            children: [jsx("strong", { children: clock.time }), jsx("span", { children: `${clock.date} / ${copy.local}` })],
          }),
        ],
      }),
    ],
  });
}

function MobileDock({ onOpenStudio, onOpenShop }) {
  return jsx("nav", {
    className: "mobile-dock",
    "aria-label": "Mobile navigation",
    children: APP_LINKS.slice(0, 3).map(([id, label]) =>
      jsxs("a", {
        href: `#${id}`,
        onClick: id === "studio" ? onOpenStudio : id === "shop" ? onOpenShop : undefined,
        children: [jsx("span", { children: jsx(AppGlyph, { id, size: 15 }) }), label],
      }, id),
    ),
  });
}

export function OSShell({ preview, previewZoom, studioState, onStudioStateChange, studioActionsRef }) {
  const [windows, setWindows] = React.useState({
    welcome: "open",
    preview: "open",
    series: "closed",
    shopSeries: "closed",
    curated: "closed",
    irl: "closed",
    seed: "closed",
    palette: "closed",
    attributes: "closed",
    export: "closed",
  });
  const [active, setActive] = React.useState("preview");
  const [maximized, setMaximized] = React.useState(false);
  const [previewResetKey, setPreviewResetKey] = React.useState(0);
  const [workspaceMode, setWorkspaceMode] = React.useState("home");
  const [cartItems, setCartItems] = React.useState([]);
  const [startOpen, setStartOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [locale, setLocale] = React.useState("en");
  const clock = useLocalClock();
  const sound = useAmbientSound();
  const copy = COPY[locale];

  const setWindowStatus = (id, status) => {
    setWindows((current) => ({ ...current, [id]: status }));
    if (status === "open") setActive(id);
    if (status !== "open" && active === id) {
      const nextActive = Object.keys(windows).find((key) => key !== id && windows[key] === "open");
      if (nextActive) setActive(nextActive);
    }
    setStartOpen(false);
  };
  const toggleTaskbarWindow = (id) => {
    if (windows[id] === "minimized") {
      setWindowStatus(id, "open");
      return;
    }
    if (windows[id] === "open" && active === id) {
      setWindowStatus(id, "minimized");
      return;
    }
    if (windows[id] === "open") setActive(id);
  };
  const openStudio = () => {
    setWorkspaceMode("studio");
    setMaximized(false);
    setPreviewResetKey((value) => value + 1);
    setWindows((current) => ({
      ...current,
      welcome: "minimized",
      preview: "open",
      series: "open",
      shopSeries: "closed",
      curated: "closed",
      irl: "closed",
      seed: "open",
      palette: "open",
      attributes: "open",
      export: "open",
    }));
    setActive("preview");
    setStartOpen(false);
  };
  const openShop = () => {
    setWorkspaceMode("shop");
    setMaximized(false);
    setPreviewResetKey((value) => value + 1);
    setWindows((current) => ({
      ...current,
      welcome: "minimized",
      preview: "open",
      series: "closed",
      seed: "closed",
      palette: "closed",
      attributes: "closed",
      export: "closed",
      shopSeries: "open",
      curated: "open",
      irl: "open",
    }));
    setActive("curated");
    setStartOpen(false);
  };
  const openHome = () => {
    setWorkspaceMode("home");
    setMaximized(false);
    setWindows((current) => ({
      ...current,
      welcome: "open",
      preview: "open",
      series: "closed",
      shopSeries: "closed",
      curated: "closed",
      irl: "closed",
      seed: "closed",
      palette: "closed",
      attributes: "closed",
      export: "closed",
    }));
    setActive("preview");
  };

  React.useEffect(() => {
    const closeStart = (event) => {
      if (!event.target.closest(".start-menu, .start-button")) setStartOpen(false);
    };
    window.addEventListener("pointerdown", closeStart);
    return () => window.removeEventListener("pointerdown", closeStart);
  }, []);

  return jsxs("div", {
    className: "os-shell",
    children: [
      jsx(SiteHeader, {
        copy,
        cartCount: cartItems.length,
        menuOpen,
        onMenuToggle: () => setMenuOpen((value) => !value),
        onMenuClose: () => setMenuOpen(false),
        onOpenStudio: openStudio,
        onOpenShop: openShop,
        onHome: openHome,
      }),
      jsxs("main", {
        className: `desktop is-${workspaceMode}`,
        id: "home",
        children: [
          jsx("div", { className: "desktop-watermark", "aria-hidden": "true", children: "H/01" }),
          jsx("p", { className: "desktop-coordinate", children: "34.0522° N / 118.2437° W" }),
          jsx(WelcomeWindow, {
            copy,
            onOpenStudio: openStudio,
            status: windows.welcome,
            active: active === "welcome",
            onFocus: () => setActive("welcome"),
            onMinimize: () => setWindowStatus("welcome", "minimized"),
            onClose: () => setWindowStatus("welcome", "closed"),
          }),
          jsx(PreviewWindow, {
            preview,
            previewZoom,
            workspaceMode,
            studioState,
            actionsRef: studioActionsRef,
            resetPositionKey: previewResetKey,
            status: windows.preview,
            active: active === "preview",
            maximized,
            onFocus: () => setActive("preview"),
            onMinimize: () => setWindowStatus("preview", "minimized"),
            onClose: () => setWindowStatus("preview", "closed"),
            onMaximize: () => setMaximized((value) => !value),
          }),
          workspaceMode === "studio" &&
            jsx(StudioWorkspace, {
              state: studioState,
              onStateChange: onStudioStateChange,
              actionsRef: studioActionsRef,
              windows,
              active,
              onFocus: setActive,
              onMinimize: (id) => setWindowStatus(id, "minimized"),
              onClose: (id) => setWindowStatus(id, "closed"),
            }),
          workspaceMode === "shop" &&
            jsx(ShopWorkspace, {
              state: studioState,
              onStateChange: onStudioStateChange,
              windows,
              active,
              onFocus: setActive,
              onMinimize: (id) => setWindowStatus(id, "minimized"),
              onClose: (id) => setWindowStatus(id, "closed"),
              onAddToCart: (item) => setCartItems((current) => [...current, item]),
            }),
        ],
      }),
      jsx(Taskbar, {
        copy,
        windows,
        active,
        clock,
        locale,
        sound,
        startOpen,
        onStart: () => setStartOpen((value) => !value),
        onRestore: (id) => setWindowStatus(id, "open"),
        onTaskWindow: toggleTaskbarWindow,
        onLocale: () => setLocale((value) => (value === "en" ? "fr" : "en")),
        onOpenStudio: openStudio,
        onOpenShop: openShop,
      }),
      jsx(MobileDock, { onOpenStudio: openStudio, onOpenShop: openShop }),
    ],
  });
}
