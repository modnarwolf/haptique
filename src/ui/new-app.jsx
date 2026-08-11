import * as React from "react";
import { ArrowDown, ArrowUpRight, Check, Copy, Download, FolderOpen, Link2, Menu, Minus, Plus, RotateCcw, ShoppingBag, X } from "lucide-react";
import { PRODUCT_TYPES, CAMPAIGN_SERIES, SERIES_PLACEHOLDER_COLORS, getProductFormat, productPrice } from "../data/product-catalog.js";
import { createDefaultPatternState, getPalette, SERIES } from "../pattern-studio/pattern-data.js";
import { P5PatternEngine } from "../pattern-studio/p5-pattern-engine.js";
import { applyPatternSnapshot, createPatternShareUrl, createPatternSnapshot, decodePatternShare, encodePatternShare } from "../pattern-studio/pattern-share.js";

const LazyClothExperience = React.lazy(() =>
  import("./haptique-app.js").then((module) => ({ default: module.ClothExperience })),
);

const LOGOS = ["/logoA.svg", "/logoB.svg", "/logoC.svg"];
const HERO_DURATION = 6500;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function FluidLogo({ onNavigate }) {
  const [index, setIndex] = React.useState(() => Math.floor(Math.random() * LOGOS.length));
  const timer = React.useRef(null);
  const stop = () => window.clearInterval(timer.current);
  const start = () => {
    stop();
    setIndex((value) => (value + 1) % LOGOS.length);
    timer.current = window.setInterval(() => setIndex((value) => (value + 1) % LOGOS.length), 170);
  };
  React.useEffect(() => stop, []);
  return (
    <button className="fluid-logo" onClick={() => onNavigate("shop")} onPointerEnter={start} onPointerLeave={stop} aria-label="Haptique — go to shop">
      <img src={LOGOS[index]} alt="Haptique" />
    </button>
  );
}

function Header({ page, onNavigate, cartCount, onCart }) {
  const [open, setOpen] = React.useState(false);
  const go = (target) => { onNavigate(target); setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <header className="site-header">
      <FluidLogo onNavigate={go} />
      <p className="header-note">CREATIVE SOFTWARE<br />FOR REAL THINGS</p>
      <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="Primary navigation">
        {["shop", "studio", "about"].map((item) => (
          <button key={item} className={page === item || (page === "series" && item === "shop") ? "is-active" : ""} onClick={() => go(item)}>{item}</button>
        ))}
      </nav>
      <button className="cart-trigger" onClick={onCart} aria-label={`Open cart with ${cartCount} items`}>
        <ShoppingBag size={17} strokeWidth={1.5} /><span>Cart ({cartCount})</span>
      </button>
      <button className="menu-trigger" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
    </header>
  );
}

function PatternCanvas({ state, onEngine, onImage, className = "" }) {
  const host = React.useRef(null);
  const engine = React.useRef(null);
  React.useEffect(() => {
    const nextEngine = new P5PatternEngine((canvas) => {
      if (host.current && canvas.parentElement !== host.current) host.current.appendChild(canvas);
      onImage?.(canvas.toDataURL("image/png"));
    });
    engine.current = nextEngine;
    onEngine?.(nextEngine);
    nextEngine.setState(state);
    return () => { nextEngine.dispose(); onEngine?.(null); };
  }, []);
  React.useEffect(() => engine.current?.setState(state), [state]);
  return <div className={`pattern-canvas ${className}`} ref={host} style={{ aspectRatio: `${state.width} / ${state.height}` }} aria-label="Generated pattern preview" />;
}

function CuratedSeedPreview({ item }) {
  const previewState = React.useMemo(() => {
    try {
      return { ...applyPatternSnapshot(createDefaultPatternState(), decodePatternShare(item.hash)), width: 240, height: 320 };
    } catch {
      return { ...createDefaultPatternState(), width: 240, height: 320 };
    }
  }, [item.hash]);
  return <PatternCanvas state={previewState} className="curated-thumbnail" />;
}

function ShopPage({ onOpenStudio, onOpenSeries }) {
  const [seriesIndex, setSeriesIndex] = React.useState(() => Math.floor(Math.random() * CAMPAIGN_SERIES.length));
  const [cycleKey, setCycleKey] = React.useState(0);
  const active = CAMPAIGN_SERIES[seriesIndex];

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setSeriesIndex((index) => (index + 1) % CAMPAIGN_SERIES.length);
      setCycleKey((key) => key + 1);
    }, HERO_DURATION);
    return () => window.clearTimeout(timer);
  }, [seriesIndex, cycleKey]);

  const chooseSeries = (index) => {
    setSeriesIndex(index);
    setCycleKey((key) => key + 1);
  };

  return (
    <main>
      <section className="shop-hero" style={{ "--series-accent": active.accent }}>
        <div className="hero-copy">
          <p className="index-label">HAPTIQUE / SERIES {active.number}</p>
          <h1>One number.<br />One pattern.<br /><em>A real thing.</em></h1>
          <p className="hero-intro">{active.intro} Every piece begins in the browser, then gets made for you.</p>
          <div className="hero-actions">
            <button className="primary-text-link" onClick={() => onOpenStudio(active.id)}>Make your own <ArrowUpRight size={18} /></button>
            <button className="secondary-text-link" onClick={() => onOpenSeries(active.id)}>View the series</button>
          </div>
        </div>
        <button className="hero-image" onClick={() => onOpenSeries(active.id)} aria-label={`View the ${active.name} series`}><img src={active.images[0]} alt={`${active.name} series campaign`} loading="eager" fetchPriority="high" decoding="async" /></button>
        <div className="series-switcher">
          {CAMPAIGN_SERIES.map((series, index) => (
            <button key={series.id} className={index === seriesIndex ? "is-active" : ""} onClick={() => chooseSeries(index)}>
              <span>{series.number}</span><strong>{series.name}</strong>
              {index === seriesIndex && <i className="series-progress" key={`${series.id}-${cycleKey}`} />}
            </button>
          ))}
        </div>
      </section>

      <section className="collection-section">
        <header className="section-heading">
          <div><p className="index-label">AVAILABLE NOW / 03 SERIES</p><h2>Patterns with a physical life.</h2></div>
          <p>Each seed is deterministic: return to the same number and the same composition returns with it.</p>
        </header>
        <div className="campaign-grid">
          {CAMPAIGN_SERIES.map((series) => (
            <article className="campaign-card" key={series.id} onClick={() => onOpenSeries(series.id)}>
              <img src={series.images[2]} alt={`${series.name} product preview`} />
              <div><h3>{series.name}</h3><span>Series {series.number}</span><ArrowUpRight size={18} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-invitation" style={{ "--series-accent": active.accent }}>
        <div className="studio-invitation-visual">
          <img src={active.images[1]} alt={`${active.name} series alternate campaign`} />
          <span>{active.name.toUpperCase()} / SEED 001042</span>
        </div>
        <div className="studio-invitation-copy">
          <p className="index-label">THE PATTERN STUDIO / LIVE</p>
          <div>
            <h2>Don’t just<br />choose one.<br /><em>Find yours.</em></h2>
            <p>Use {active.name} as your starting point, then change the seed, palette, and structure. The Studio remembers every coordinate.</p>
          </div>
          <button className="primary-text-link" onClick={() => onOpenStudio(active.id)}>Open {active.name} in Studio <ArrowUpRight size={18} /></button>
        </div>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <header>
          <p className="index-label">HOW HAPTIQUE WORKS / THREE MOVES</p>
          <h2 id="process-title">From an idea<br />to an object.</h2>
        </header>
        <ol>
          <li><span>01</span><div><h3>Choose a series</h3><p>Start with a visual system and its own set of rules.</p></div></li>
          <li><span>02</span><div><h3>Discover art you love</h3><p>Move through seeds, colors, and structures until one feels yours.</p></div></li>
          <li><span>03</span><div><h3>Make it real</h3><p>Carry the exact design from the browser onto a physical object.</p></div></li>
        </ol>
      </section>
    </main>
  );
}

function SeriesPage({ series, onOpenStudio }) {
  const colors = SERIES_PLACEHOLDER_COLORS[series.id] ?? ["#aaa", "#bbb", "#999", "#ccc"];
  const suggestedSeries = React.useMemo(() => {
    const choices = SERIES.filter((item) => item.id !== series.id);
    return choices[Math.floor(Math.random() * choices.length)] ?? SERIES[0];
  }, [series.id]);
  const suggestedState = React.useMemo(() => ({
    ...createDefaultPatternState(),
    seriesId: suggestedSeries.id,
    seed: Math.floor(Math.random() * 1000000),
    width: 900,
    height: 1200,
  }), [suggestedSeries.id]);
  const suggestedNumber = suggestedSeries.id.slice(2, 4);
  return (
    <main className="series-page" style={{ "--series-accent": series.accent }}>
      <section className="series-intro">
        <div className="series-copy">
          <p className="index-label">SERIES {series.number} / {series.id.toUpperCase()}</p>
          <div className="series-copy-content">
            <h1>{series.name}</h1>
            <p>{series.intro} Every variation is recoverable from its seed.</p>
            <button className="primary-text-link" onClick={() => onOpenStudio(series.id)}>Open in Studio <ArrowUpRight size={18} /></button>
          </div>
        </div>
        <img src={series.images[0]} alt={`${series.name} campaign`} loading="eager" fetchPriority="high" decoding="async" />
      </section>
      <section className="series-gallery">{series.images.slice(1).map((image, index) => <img src={image} alt={`${series.name} campaign view ${index + 2}`} loading="lazy" decoding="async" key={image} />)}</section>
      <section className="series-products">
        <header><p className="index-label">THE SERIES / FOUR OBJECTS</p><h2>One system,<br />different surfaces.</h2></header>
        <div className="series-product-grid">
          {PRODUCT_TYPES.map((product, index) => (
            <article key={product.id}>
              <div className="series-product-image" style={{ background: colors[index] }}>
                {product.id === "tote" ? <img src={series.images[0]} alt={`${series.name} ${product.name}`} /> : <span>PRODUCT IMAGE<br />COMING SOON</span>}
              </div>
              <div><h3>{product.name}</h3><span>{product.sizes.length} {product.sizes.length === 1 ? "size" : "sizes"}</span></div>
            </article>
          ))}
        </div>
      </section>
      <section className="next-series" aria-label="Suggested series">
        <div className="next-series-copy">
          <p className="index-label">UP NEXT / SERIES {suggestedNumber}</p>
          <div>
            <h2>{suggestedSeries.name}</h2>
            <p>{suggestedSeries.note}</p>
          </div>
          <button className="primary-text-link" onClick={() => onOpenStudio(suggestedSeries.id)}>Explore in Studio <ArrowUpRight size={18} /></button>
        </div>
        <button className="next-series-preview" onClick={() => onOpenStudio(suggestedSeries.id)} aria-label={`Explore ${suggestedSeries.name} in the Pattern Studio`}>
          <PatternCanvas state={suggestedState} />
        </button>
      </section>
    </main>
  );
}

function StudioPage({ state, setState, onAdd }) {
  const engine = React.useRef(null);
  const [patternImage, setPatternImage] = React.useState("");
  const [product, setProduct] = React.useState(PRODUCT_TYPES[0]);
  const [size, setSize] = React.useState(PRODUCT_TYPES[0].sizes[1]);
  const [curated, setCurated] = React.useState([]);
  const [shareInput, setShareInput] = React.useState("");
  const [shareStatus, setShareStatus] = React.useState("");
  const [mobileIntroOpen, setMobileIntroOpen] = React.useState(true);
  const definition = SERIES.find((item) => item.id === state.seriesId);
  const paletteIndex = state.paletteIndexesBySeriesId[state.seriesId] ?? 0;
  const palette = getPalette(state);
  const format = getProductFormat(product.id, size);
  const shareCode = encodePatternShare(createPatternSnapshot(state));
  const shareUrl = typeof window === "undefined" ? "" : createPatternShareUrl(shareCode);

  React.useEffect(() => {
    fetch("/textures/curated/blankets/curated_list.json").then((response) => response.json()).then((data) => setCurated(data.series?.[state.seriesId] ?? [])).catch(() => setCurated([]));
  }, [state.seriesId]);

  React.useEffect(() => setSize(product.sizes[Math.min(1, product.sizes.length - 1)]), [product]);

  React.useEffect(() => {
    setState((current) => current.width === format.width && current.height === format.height
      ? current
      : { ...current, width: format.width, height: format.height, printPreset: `${product.id}:${format.size}` });
  }, [format.width, format.height, format.size, product.id, setState]);

  const updateSeries = (seriesId) => setState((current) => ({ ...current, seriesId }));
  const updatePalette = (index) => setState((current) => ({ ...current, paletteIndexesBySeriesId: { ...current.paletteIndexesBySeriesId, [current.seriesId]: index }, paletteValuesBySeriesId: { ...current.paletteValuesBySeriesId, [current.seriesId]: { bg: definition.palettes[index].bg, colors: [...definition.palettes[index].colors] } } }));
  const updatePaletteColor = (kind, index, value) => setState((current) => {
    const currentPalette = current.paletteValuesBySeriesId[current.seriesId];
    const nextPalette = kind === "bg"
      ? { ...currentPalette, bg: value }
      : { ...currentPalette, colors: currentPalette.colors.map((color, colorIndex) => colorIndex === index ? value : color) };
    return { ...current, paletteValuesBySeriesId: { ...current.paletteValuesBySeriesId, [current.seriesId]: nextPalette } };
  });
  const updateParameter = (key, value) => setState((current) => ({ ...current, parametersBySeriesId: { ...current.parametersBySeriesId, [current.seriesId]: { ...current.parametersBySeriesId[current.seriesId], [key]: value } } }));
  const randomize = () => setState((current) => ({ ...current, seed: Math.floor(Math.random() * 1000000) }));
  const randomizeAll = () => setState((current) => {
    const currentDefinition = SERIES.find((item) => item.id === current.seriesId);
    if (!currentDefinition) return current;
    const nextPaletteIndex = Math.floor(Math.random() * currentDefinition.palettes.length);
    const nextPalette = currentDefinition.palettes[nextPaletteIndex];
    const nextParameters = Object.fromEntries(currentDefinition.parameters.map((parameter) => {
      if (parameter.options) return [parameter.key, parameter.options[Math.floor(Math.random() * parameter.options.length)]];
      const steps = Math.max(0, Math.round((parameter.max - parameter.min) / parameter.step));
      const value = parameter.min + Math.floor(Math.random() * (steps + 1)) * parameter.step;
      const precision = Math.max(0, (String(parameter.step).split(".")[1] || "").length);
      return [parameter.key, Number(value.toFixed(precision))];
    }));
    return {
      ...current,
      seed: Math.floor(Math.random() * 1000000),
      paletteIndexesBySeriesId: { ...current.paletteIndexesBySeriesId, [current.seriesId]: nextPaletteIndex },
      paletteValuesBySeriesId: { ...current.paletteValuesBySeriesId, [current.seriesId]: { bg: nextPalette.bg, colors: [...nextPalette.colors] } },
      parametersBySeriesId: { ...current.parametersBySeriesId, [current.seriesId]: nextParameters },
    };
  });
  const cyclePalette = () => updatePalette((paletteIndex + 1) % definition.palettes.length);
  const selectCurated = (item) => { try { setState((current) => applyPatternSnapshot(current, decodePatternShare(item.hash))); } catch {} };
  const copyShare = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setShareStatus(`${label} copied`);
    } catch {
      setShareInput(value);
      setShareStatus("Clipboard access is unavailable — copy the selected text below");
    }
  };
  const openSharedDesign = () => {
    try {
      const snapshot = decodePatternShare(shareInput);
      setState((current) => applyPatternSnapshot(current, snapshot));
      setShareStatus("Shared design opened");
    } catch (error) {
      setShareStatus(error.message || "That shared design could not be opened");
    }
  };
  const add = () => onAdd({
    lineId: crypto.randomUUID(),
    seriesId: state.seriesId,
    seriesName: definition.name,
    seed: state.seed,
    designHash: encodePatternShare(createPatternSnapshot(state)),
    productId: product.id,
    productName: product.name,
    size,
    price: productPrice(product.id, size),
    quantity: 1,
    image: patternImage,
    aspectRatio: format.aspectRatio,
    printSpec: format,
  });

  return (
    <main className="studio-page">
      <div className={mobileIntroOpen ? "mobile-studio-intro is-open" : "mobile-studio-intro"} role="dialog" aria-modal="true" aria-hidden={!mobileIntroOpen} aria-label="Pattern Studio introduction">
        <div>
          <p className="index-label">PATTERN STUDIO / LIVE</p>
          <h1>Find a pattern<br />only you could find.</h1>
          <p>Choose a series, change its palette, and let a seed lead you somewhere new.</p>
          <button className="primary-text-link" onClick={() => setMobileIntroOpen(false)}>Continue <ArrowDown size={17} /></button>
        </div>
      </div>
      <div className="studio-title"><p className="index-label">PATTERN STUDIO / LIVE</p><h1>Find a pattern<br />only you could find.</h1><p>Every seed is a coordinate in the series. Change the number, palette, or structure. The same inputs always lead back to the same work.</p></div>
      <div className="studio-workspace">
        <aside className="studio-controls">
          <div className="control-block"><label>01 / Series</label><select value={state.seriesId} onChange={(event) => updateSeries(event.target.value)}>{SERIES.map((item) => <option value={item.id} key={item.id}>{item.id.toUpperCase()} — {item.name}</option>)}</select><p>{definition.note}</p></div>
          <div className="control-block"><label>02 / Seed</label><div className="seed-input"><input type="number" min="0" max="999999" value={state.seed} onChange={(event) => setState((current) => ({ ...current, seed: Math.max(0, Math.min(999999, Number(event.target.value))) }))} /><button onClick={randomize} aria-label="Random seed"><RotateCcw size={17} /></button></div></div>
          <div className="control-block"><label>03 / Palette</label><div className="palette-list">{definition.palettes.map((item, index) => <button key={item.name} className={paletteIndex === index ? "is-active" : ""} onClick={() => updatePalette(index)}><i style={{ background: item.bg }} />{item.colors.slice(0, 5).map((color) => <i key={color} style={{ background: color }} />)}<span>{item.name}</span></button>)}</div><div className="color-editor"><label title="Background color"><input type="color" value={palette.bg} onChange={(event) => updatePaletteColor("bg", 0, event.target.value)} /><span>BG</span></label>{palette.colors.map((color, index) => <label key={`${index}-${color}`} title={`Custom color ${index + 1}`}><input type="color" value={color} onChange={(event) => updatePaletteColor("color", index, event.target.value)} /><span>{String(index + 1).padStart(2, "0")}</span></label>)}</div></div>
          <div className="control-block parameter-list"><label>04 / Structure</label>{definition.parameters.map((item) => item.options ? <div className="range-control" key={item.key}><span>{item.label}</span><select value={state.parametersBySeriesId[state.seriesId][item.key]} onChange={(event) => updateParameter(item.key, event.target.value)}>{item.options.map((option) => <option key={option}>{option}</option>)}</select></div> : <div className="range-control" key={item.key}><span>{item.label}</span><output>{state.parametersBySeriesId[state.seriesId][item.key]}</output><input type="range" min={item.min} max={item.max} step={item.step} value={state.parametersBySeriesId[state.seriesId][item.key]} onChange={(event) => updateParameter(item.key, Number(event.target.value))} /></div>)}</div>
          <div className="control-block share-design"><label>05 / Share or open</label><code title={shareCode}>{shareCode}</code><div className="share-buttons"><button onClick={() => copyShare(shareCode, "Hash")}><Copy size={13} /> Copy hash</button><button onClick={() => copyShare(shareUrl, "Link")}><Link2 size={13} /> Copy link</button></div><textarea value={shareInput} onChange={(event) => setShareInput(event.target.value)} placeholder="Paste a Haptique hash or shared link…" aria-label="Shared design hash or link" /><button className="open-share-button" onClick={openSharedDesign} disabled={!shareInput.trim()}><FolderOpen size={14} /> Open shared design</button>{shareStatus && <output><Check size={12} /> {shareStatus}</output>}</div>
        </aside>
        <section className="studio-preview"><PatternCanvas key={state.seriesId} state={state} onEngine={(value) => { engine.current = value; }} onImage={setPatternImage} /><div className="preview-meta"><span>{state.seriesId.toUpperCase()} / {String(state.seed).padStart(6, "0")} / {format.widthIn}:{format.heightIn}</span><button onClick={() => engine.current?.exportFlatPattern({ maxEdge: 2400, label: "proof" })}><Download size={15} /> Export proof</button></div></section>
        <aside className="make-panel"><p className="index-label">MAKE IT PHYSICAL</p><h2>{definition.name}<br /><span>Seed {String(state.seed).padStart(6, "0")}</span></h2><div className="option-group"><label>Object</label><div className="stacked-options">{PRODUCT_TYPES.map((item) => <button key={item.id} className={product.id === item.id ? "is-active" : ""} onClick={() => setProduct(item)}><span>{item.name}</span><small>{item.description}</small></button>)}</div></div><div className="option-group"><label>Size</label><select value={size} onChange={(event) => setSize(event.target.value)}>{product.sizes.map((item) => <option key={item}>{item}</option>)}</select></div><div className="print-spec"><span>Print target</span><strong>{format.width} × {format.height} px</strong><small>RGB / {format.dpi} DPI · browser preview capped at 1600 px</small></div><button className="add-button" onClick={add}><span>Add to cart</span><strong>{money.format(productPrice(product.id, size))}</strong></button><p className="fine-print">The cart stores the complete deterministic design hash and print target so production artwork can be regenerated server-side at full resolution.</p></aside>
        <div className="mobile-studio-controls">
          <div className="mobile-control-row">
            <label><span>Series</span><select value={state.seriesId} onChange={(event) => updateSeries(event.target.value)}>{SERIES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <button onClick={randomizeAll}><RotateCcw size={15} /><span>Randomize</span></button>
            <button onClick={cyclePalette}><span className="mobile-palette-dots" aria-hidden="true">{palette.colors.slice(0, 3).map((color) => <i key={color} style={{ background: color }} />)}</span><span>Palette</span></button>
          </div>
          <div className="mobile-product-row">
            <label><span>Object</span><select value={product.id} onChange={(event) => setProduct(PRODUCT_TYPES.find((item) => item.id === event.target.value) ?? PRODUCT_TYPES[0])}>{PRODUCT_TYPES.map((item) => <option value={item.id} key={item.id}>{item.short}</option>)}</select></label>
            <label><span>Size</span><select value={size} onChange={(event) => setSize(event.target.value)}>{product.sizes.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <button className="add-button mobile-add-button" onClick={add}><span>Add {product.short} to cart</span><strong>{money.format(productPrice(product.id, size))}</strong></button>
        </div>
      </div>
      <section className="curated-section"><div><p className="index-label">CURATED COORDINATES</p><h2>Seeds worth returning to.</h2></div><div className="curated-row">{curated.slice(0, 12).map((item) => <button key={item.id} onClick={() => selectCurated(item)} className={decodeSafeSeed(item.hash) === state.seed ? "is-active" : ""}><CuratedSeedPreview item={item} /><span>{item.name.replace("Edition ", "")}</span><strong>{String(decodeSafeSeed(item.hash)).padStart(6, "0")}</strong></button>)}</div></section>
    </main>
  );
}

function decodeSafeSeed(hash) { try { return decodePatternShare(hash).seed; } catch { return 0; } }

function AboutPage({ patternState }) {
  const [showCloth, setShowCloth] = React.useState(false);
  const actions = React.useRef(null);
  return (
    <main className="about-page">
      <section className="about-intro"><p className="index-label">ABOUT / HAPTIQUE</p><h1>Digital patterns<br />want to be touched.</h1><p className="about-lede">Haptique is a generative design studio and made-to-order shop. We build visual systems in code, give you the controls, then translate your chosen result into an object for everyday life.</p></section>
      <section className="about-image"><img src="/model_mock_previews/swatch_preview_A.png" alt="Swatch tote in an interior" /></section>
      <section className="about-manifesto"><p>Each series is a small world with its own rules. A seed is not a limited edition number or a random label—it is the precise coordinate that lets the artwork exist again.</p><p>Making only after an order means fewer speculative objects and more personal ones. Posters, stretched canvases, totes, and woven blankets are our first material vocabulary.</p></section>
      <section className="cloth-invitation"><div><p className="index-label">A SMALL EASTER EGG</p><h2>Before the objects,<br />there was the cloth.</h2></div><button onClick={() => setShowCloth(true)}>Touch the original experiment <ArrowUpRight size={17} /></button></section>
      {showCloth && <div className="cloth-modal" role="dialog" aria-modal="true" aria-label="Interactive 3D cloth"><button className="cloth-close" onClick={() => setShowCloth(false)}><X size={20} /> Close</button><div className="cloth-scene"><React.Suspense fallback={<div className="cloth-loading">Loading the original cloth…</div>}><LazyClothExperience patternState={patternState} studioActionsRef={actions} onZoomChange={() => {}} /></React.Suspense></div><p className="cloth-hint">Drag the fabric. Scroll to move closer.</p></div>}
    </main>
  );
}

function CartDrawer({ items, open, onClose, onChange, onRemove }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [message, setMessage] = React.useState("");
  const checkout = () => setMessage("Checkout is staged for Printify + Stripe. Add server credentials to enable live orders.");
  return <><button className={open ? "cart-scrim is-open" : "cart-scrim"} onClick={onClose} aria-label="Close cart" /><aside className={open ? "cart-drawer is-open" : "cart-drawer"} aria-hidden={!open}><header><p>YOUR CART / {String(items.length).padStart(2, "0")}</p><button onClick={onClose} aria-label="Close cart"><X /></button></header>{items.length ? <><div className="cart-items">{items.map((item) => <article className="cart-line" key={item.lineId}><div className="cart-thumb" style={{ aspectRatio: item.aspectRatio || 1 }}>{item.image && <img src={item.image} alt="" />}</div><div><h3>{item.seriesName} / {String(item.seed).padStart(6, "0")}</h3><p>{item.productName}<br />{item.size}<br />{item.printSpec?.width} × {item.printSpec?.height} px</p><div className="quantity"><button onClick={() => onChange(item.lineId, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => onChange(item.lineId, 1)}><Plus size={13} /></button></div><button className="remove" onClick={() => onRemove(item.lineId)}>Remove</button></div><strong>{money.format(item.price * item.quantity)}</strong></article>)}</div><footer><div><span>Subtotal</span><strong>{money.format(total)}</strong></div><p>Shipping and taxes calculated at checkout.</p><button className="checkout-button" onClick={checkout}>Checkout <ArrowUpRight size={17} /></button>{message && <output>{message}</output>}</footer></> : <div className="empty-cart"><ShoppingBag size={30} strokeWidth={1.2} /><p>Your future object<br />is still a number.</p><button onClick={onClose}>Keep looking</button></div>}</aside></>;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/logoB.svg" alt="Haptique" />
        <p>Creative software<br />for real things.</p>
      </div>
      <div className="footer-details">
        <section><p>CONTACT</p><a href="mailto:hello@haptique.studio">hello@haptique.studio</a></section>
        <section><p>FOLLOW</p><a href="https://www.instagram.com/haptique.studio/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.are.na/haptique" target="_blank" rel="noreferrer">Are.na ↗</a></section>
        <section><p>MADE</p><span>On demand in small runs.<br />Designed in Los Angeles.</span></section>
      </div>
      <div className="footer-bottom"><span>HAPTIQUE © 2026</span><span>SEED BY SEED / OBJECT BY OBJECT</span></div>
    </footer>
  );
}

export function HaptiqueApp() {
  const hasSharedDesign = typeof window !== "undefined" && window.location.hash.startsWith("#design=");
  const [page, setPage] = React.useState(() => hasSharedDesign ? "studio" : "shop");
  const [patternState, setPatternState] = React.useState(() => {
    const initialState = createDefaultPatternState();
    if (!hasSharedDesign) return initialState;
    try {
      return applyPatternSnapshot(initialState, decodePatternShare(window.location.href));
    } catch {
      return initialState;
    }
  });
  const [selectedSeries, setSelectedSeries] = React.useState(CAMPAIGN_SERIES[0]);
  const [cart, setCart] = React.useState([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const add = (item) => { setCart((items) => [...items, item]); setCartOpen(true); };
  const quantity = (lineId, amount) => setCart((items) => items.map((item) => item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  const navigate = (target) => { setPage(target); setCartOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openStudio = (seriesId) => {
    setPatternState((current) => ({ ...current, seriesId }));
    navigate("studio");
  };
  const openSeries = (seriesId) => {
    setSelectedSeries(CAMPAIGN_SERIES.find((series) => series.id === seriesId) ?? CAMPAIGN_SERIES[0]);
    navigate("series");
  };
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return <div className="haptique-site"><Header page={page} onNavigate={navigate} cartCount={count} onCart={() => setCartOpen(true)} />{page === "shop" && <ShopPage onOpenStudio={openStudio} onOpenSeries={openSeries} />}{page === "series" && <SeriesPage series={selectedSeries} onOpenStudio={openStudio} />}{page === "studio" && <StudioPage state={patternState} setState={setPatternState} onAdd={add} />}{page === "about" && <AboutPage patternState={patternState} />}<Footer /><CartDrawer items={cart} open={cartOpen} onClose={() => setCartOpen(false)} onChange={quantity} onRemove={(lineId) => setCart((items) => items.filter((item) => item.lineId !== lineId))} /></div>;
}
