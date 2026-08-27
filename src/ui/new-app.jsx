import * as React from "react";
import { ArrowUpRight, Check, Copy, Dices, Download, FolderOpen, Link2, Menu, Minus, Plus, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { loadStoredCart, primaryMockupUrl, storeCart } from "../cart/cart-storage.js";
import { PRODUCT_TYPES, getProductFormat, productPrice } from "../data/product-catalog.js";
import { CAMPAIGN_SERIES, CAMPAIGN_SERIES_BY_ID, SITE_CONTENT } from "../data/site-content.js";
import { createDefaultPatternState, getPalette, SERIES } from "../pattern-studio/pattern-data.js";
import { P5PatternEngine } from "../pattern-studio/p5-pattern-engine.js";
import { getProductPrintPreset } from "../pattern-studio/print-layouts.js";
import { applyPatternSnapshot, createPatternShareUrl, createPatternSnapshot, decodePatternShare, encodePatternShare } from "../pattern-studio/pattern-share.js";
import { hasDesignHash, pathForRoute, routeForPage, routeFromLocation, titleForRoute } from "../routing/app-routes.js";

const LazyClothExperience = React.lazy(() =>
  import("./haptique-app.js").then((module) => ({ default: module.ClothExperience })),
);

const HERO_DURATION = 6500;
const PAGE_TRANSITION_MS = 600;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function FluidLogo({ onNavigate }) {
  const [index, setIndex] = React.useState(() => Math.floor(Math.random() * SITE_CONTENT.brand.logos.length));
  const timer = React.useRef(null);
  const stop = () => window.clearInterval(timer.current);
  const start = () => {
    stop();
    setIndex((value) => (value + 1) % SITE_CONTENT.brand.logos.length);
    timer.current = window.setInterval(() => setIndex((value) => (value + 1) % SITE_CONTENT.brand.logos.length), 170);
  };
  React.useEffect(() => stop, []);
  return (
    <a className="fluid-logo" href="/" onClick={(event) => { event.preventDefault(); onNavigate("shop"); }} onPointerEnter={start} onPointerLeave={stop} aria-label={`${SITE_CONTENT.brand.name} — go to shop`}>
      <img src={SITE_CONTENT.brand.logos[index]} alt={SITE_CONTENT.brand.name} />
    </a>
  );
}

function Header({ page, onNavigate, cartCount, onCart }) {
  const [open, setOpen] = React.useState(false);
  const go = (target) => { onNavigate(target); setOpen(false); };
  return (
    <header className="site-header">
      <FluidLogo onNavigate={go} />
      <p className="header-note">{SITE_CONTENT.brand.tagline[0]}<br />{SITE_CONTENT.brand.tagline[1]}</p>
      <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="Primary navigation">
        {SITE_CONTENT.navigation.map((item) => (
          <a key={item.page} href={pathForRoute(routeForPage(item.page))} className={page === item.page || (page === "series" && item.page === "shop") ? "is-active" : ""} onClick={(event) => { event.preventDefault(); go(item.page); }}>{item.label}</a>
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

function CuratedRecipePreview({ item }) {
  const previewState = React.useMemo(() => {
    try {
      return { ...applyPatternSnapshot(createDefaultPatternState(), decodePatternShare(item.hash)), width: 480, height: 640 };
    } catch {
      return { ...createDefaultPatternState(), width: 480, height: 640 };
    }
  }, [item.hash]);
  return <PatternCanvas state={previewState} className="curated-thumbnail" />;
}

function useCuratedRecipes(seriesId) {
  const [curated, setCurated] = React.useState([]);

  React.useEffect(() => {
    let canceled = false;
    setCurated([]);
    fetch("/textures/curated/curated_list.json")
      .then((response) => {
        if (!response.ok) throw new Error("Curated recipes are unavailable");
        return response.json();
      })
      .then((data) => {
        if (!canceled) setCurated(data.series?.[seriesId] ?? []);
      })
      .catch(() => {
        if (!canceled) setCurated([]);
      });
    return () => { canceled = true; };
  }, [seriesId]);

  return curated;
}

function CuratedRecipesSection({ items, onSelect, activeSeed, className = "" }) {
  if (!items.length) return null;
  const copy = SITE_CONTENT.studio;
  return (
    <section className={`curated-section ${className}`.trim()}>
      <div><p className="index-label">{copy.curatedEyebrow}</p><h2>{copy.curatedTitle}</h2></div>
      <div className="curated-row">
        {items.slice(0, 12).map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={activeSeed !== undefined && decodeSafeSeed(item.hash) === activeSeed ? "is-active" : ""}
            aria-label={`Open ${item.name} in the Pattern Studio`}
          >
            <CuratedRecipePreview item={item} />
            <span>{item.name.replace("Edition ", "")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ShopPage({ onOpenStudio, onOpenSeries }) {
  const copy = SITE_CONTENT.shop;
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
          <p className="index-label">{copy.heroEyebrow} {active.number}</p>
          <h1>{copy.heroTitle[0]}<br />{copy.heroTitle[1]}<br /><em>{copy.heroTitle[2]}</em></h1>
          <p className="hero-intro">{active.intro} {copy.heroSuffix}</p>
          <div className="hero-actions">
            <button className="primary-text-link" onClick={() => onOpenStudio(active.id)}>{copy.makeCta} <ArrowUpRight size={18} /></button>
            <button className="secondary-text-link" onClick={() => onOpenSeries(active.id)}>{copy.seriesCta}</button>
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
          <div><p className="index-label">{copy.collectionEyebrow} / {String(CAMPAIGN_SERIES.length).padStart(2, "0")} SERIES</p><h2>{copy.collectionTitle}</h2></div>
          <p>{copy.collectionBody}</p>
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
          <span>{active.name.toUpperCase()} / GENERATED IN STUDIO</span>
        </div>
        <div className="studio-invitation-copy">
          <p className="index-label">{copy.studioEyebrow}</p>
          <div>
            <h2>{copy.studioTitle[0]}<br />{copy.studioTitle[1]}<br /><em>{copy.studioTitle[2]}</em></h2>
            <p>{copy.studioBody(active.name)}</p>
          </div>
          <button className="primary-text-link" onClick={() => onOpenStudio(active.id)}>{copy.studioCta(active.name)} <ArrowUpRight size={18} /></button>
        </div>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <header>
          <p className="index-label">{copy.processEyebrow}</p>
          <h2 id="process-title">{copy.processTitle[0]}<br />{copy.processTitle[1]}</h2>
        </header>
        <ol>
          {copy.process.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
      </section>
    </main>
  );
}

function SeriesPage({ series, onOpenStudio }) {
  const copy = SITE_CONTENT.seriesPage;
  const curated = useCuratedRecipes(series.id);
  const colors = series.productColors ?? ["#aaa", "#bbb", "#999", "#ccc"];
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
            <p>{series.intro} {copy.introSuffix}</p>
            <button className="primary-text-link" onClick={() => onOpenStudio(series.id)}>{copy.studioCta} <ArrowUpRight size={18} /></button>
          </div>
        </div>
        <img src={series.images[0]} alt={`${series.name} campaign`} loading="eager" fetchPriority="high" decoding="async" />
      </section>
      <section className="series-gallery">{series.images.slice(1).map((image, index) => <img src={image} alt={`${series.name} campaign view ${index + 2}`} loading="lazy" decoding="async" key={image} />)}</section>
      <section className="series-products">
        <header><p className="index-label">{copy.productsEyebrow}</p><h2>{copy.productsTitle[0]}<br />{copy.productsTitle[1]}</h2></header>
        <div className="series-product-grid">
          {PRODUCT_TYPES.map((product, index) => (
            <article key={product.id}>
              <div className="series-product-image" style={{ background: colors[index] }}>
                {product.id === "tote" ? <img src={series.images[0]} alt={`${series.name} ${product.name}`} /> : <span>{copy.productPlaceholder[0]}<br />{copy.productPlaceholder[1]}</span>}
              </div>
              <div><h3>{product.name}</h3><span>{product.sizes.length} {product.sizes.length === 1 ? "size" : "sizes"}</span></div>
            </article>
          ))}
        </div>
      </section>
      <CuratedRecipesSection
        items={curated}
        onSelect={(item) => onOpenStudio(series.id, item.hash)}
        className="series-curated-section"
      />
      <section className="next-series" aria-label="Suggested series">
        <div className="next-series-copy">
          <p className="index-label">{copy.nextEyebrow} {suggestedNumber}</p>
          <div>
            <h2>{suggestedSeries.name}</h2>
            <p>{suggestedSeries.note}</p>
          </div>
          <button className="primary-text-link" onClick={() => onOpenStudio(suggestedSeries.id)}>{copy.nextCta} <ArrowUpRight size={18} /></button>
        </div>
        <button className="next-series-preview" onClick={() => onOpenStudio(suggestedSeries.id)} aria-label={`Explore ${suggestedSeries.name} in the Pattern Studio`}>
          <PatternCanvas state={suggestedState} />
        </button>
      </section>
    </main>
  );
}

function StudioPage({ state, setState, onPreview, onSeriesChange }) {
  const copy = SITE_CONTENT.studio;
  const engine = React.useRef(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [previewStatus, setPreviewStatus] = React.useState("");
  const [product, setProduct] = React.useState(() => PRODUCT_TYPES.find((item) => item.id === "tote") ?? PRODUCT_TYPES[0]);
  const [size, setSize] = React.useState(() => (PRODUCT_TYPES.find((item) => item.id === "tote") ?? PRODUCT_TYPES[0]).sizes[0]);
  const [handleColor, setHandleColor] = React.useState("Black");
  const curated = useCuratedRecipes(state.seriesId);
  const [shareInput, setShareInput] = React.useState("");
  const [shareStatus, setShareStatus] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const definition = SERIES.find((item) => item.id === state.seriesId);
  const paletteIndex = state.paletteIndexesBySeriesId[state.seriesId] ?? 0;
  const palette = getPalette(state);
  const format = getProductFormat(product.id, size);
  const isTote = product.id === "tote";
  const shareCode = encodePatternShare(createPatternSnapshot(state));
  const shareUrl = typeof window === "undefined" ? "" : createPatternShareUrl(shareCode);

  React.useEffect(() => setSize(product.sizes[Math.min(1, product.sizes.length - 1)]), [product]);

  React.useEffect(() => {
    if (product.id === "tote" && !product.handleColors.includes(handleColor)) {
      setHandleColor(product.defaultHandleColor);
    }
  }, [handleColor, product]);

  React.useEffect(() => {
    const studioWidth = format.artworkWidth ?? format.width;
    const studioHeight = format.artworkHeight ?? format.height;
    setState((current) => current.width === studioWidth && current.height === studioHeight
      ? current
      : { ...current, width: studioWidth, height: studioHeight, printPreset: undefined });
  }, [format.artworkHeight, format.artworkWidth, format.height, format.width, setState]);

  React.useEffect(() => {
    if (!isTote) return;
    setState((current) => {
      const parameters = current.parametersBySeriesId[current.seriesId];
      if (!parameters || !("frame" in parameters) || parameters.frame === 0) return current;
      return {
        ...current,
        parametersBySeriesId: {
          ...current.parametersBySeriesId,
          [current.seriesId]: { ...parameters, frame: 0 },
        },
      };
    });
  }, [isTote, setState, state.seriesId]);

  const updateSeries = (seriesId) => {
    setState((current) => ({ ...current, seriesId }));
    onSeriesChange(seriesId);
  };
  const updatePalette = (index) => setState((current) => ({ ...current, paletteIndexesBySeriesId: { ...current.paletteIndexesBySeriesId, [current.seriesId]: index }, paletteValuesBySeriesId: { ...current.paletteValuesBySeriesId, [current.seriesId]: { bg: definition.palettes[index].bg, colors: [...definition.palettes[index].colors] } } }));
  const updatePaletteColor = (kind, index, value) => setState((current) => {
    const currentPalette = current.paletteValuesBySeriesId[current.seriesId];
    const nextPalette = kind === "bg"
      ? { ...currentPalette, bg: value }
      : { ...currentPalette, colors: currentPalette.colors.map((color, colorIndex) => colorIndex === index ? value : color) };
    return { ...current, paletteValuesBySeriesId: { ...current.paletteValuesBySeriesId, [current.seriesId]: nextPalette } };
  });
  const updateParameter = (key, value) => setState((current) => ({ ...current, parametersBySeriesId: { ...current.parametersBySeriesId, [current.seriesId]: { ...current.parametersBySeriesId[current.seriesId], [key]: value } } }));
  const randomizeAll = () => setState((current) => {
    const currentDefinition = SERIES.find((item) => item.id === current.seriesId);
    if (!currentDefinition) return current;
    const nextPaletteIndex = Math.floor(Math.random() * currentDefinition.palettes.length);
    const nextPalette = currentDefinition.palettes[nextPaletteIndex];
    const nextParameters = Object.fromEntries(currentDefinition.parameters.map((parameter) => {
      if (isTote && parameter.key === "frame") return [parameter.key, 0];
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
      if (snapshot.seriesId) onSeriesChange(snapshot.seriesId);
      setShareStatus("Recipe opened");
    } catch (error) {
      setShareStatus(error.message || "That recipe could not be opened");
    }
  };
  const previewProduct = async () => {
    if (!engine.current || previewing) return;
    setPreviewing(true);
    setPreviewStatus("Preparing your product preview…");
    try {
      const printPreset = getProductPrintPreset(product.id, size);
      const artwork = printPreset
        ? await engine.current.createProductArtworkBlob({
            printPreset,
            label: `${product.id}-${size.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
          })
        : await engine.current.createFlatPatternBlob({
            label: `${product.id}-${size.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
          });
      if (artwork.width !== format.width || artwork.height !== format.height) {
        throw new Error(`${product.name} artwork has the wrong dimensions.`);
      }
      onPreview({
        ...artwork,
        seriesId: state.seriesId,
        seriesName: definition.name,
        seed: state.seed,
        designHash: encodePatternShare(createPatternSnapshot(state)),
        productId: product.id,
        productName: product.name,
        size,
        handleColor: isTote ? handleColor : undefined,
        price: productPrice(product.id, size),
        aspectRatio: format.aspectRatio,
        printSpec: format,
      });
    } catch (error) {
      setPreviewStatus(error.message || "The production artwork could not be built.");
      setPreviewing(false);
    }
  };

  return (
    <main className="studio-page">
      <div className="studio-title"><p className="index-label">{copy.eyebrow}</p><h1>{copy.title[0]}<br />{copy.title[1]}</h1><p>{copy.intro}</p></div>
      <div className="studio-workspace">
        <aside className="studio-controls">
          <div className="control-block"><label>01 / Series</label><select value={state.seriesId} onChange={(event) => updateSeries(event.target.value)}>{SERIES.map((item) => <option value={item.id} key={item.id}>{item.id.toUpperCase()} — {item.name}</option>)}</select><p>{definition.note}</p></div>
          <div className="control-block share-design"><label>02 / Shuffle or open recipe</label><button className="shuffle-button" onClick={randomizeAll} aria-label="Shuffle recipe, palette, and structure"><Dices size={17} /> Shuffle</button><code title={shareCode}>{shareCode}</code><div className="share-buttons"><button onClick={() => copyShare(shareCode, "Recipe")}><Copy size={13} /> Copy recipe</button><button onClick={() => copyShare(shareUrl, "Link")}><Link2 size={13} /> Copy link</button></div><textarea value={shareInput} onChange={(event) => setShareInput(event.target.value)} placeholder="Paste a Haptique recipe or shared link…" aria-label="Shared recipe or link" /><button className="open-share-button" onClick={openSharedDesign} disabled={!shareInput.trim()}><FolderOpen size={14} /> Open recipe</button>{shareStatus && <output><Check size={12} /> {shareStatus}</output>}</div>
          <div className="control-block"><label>03 / Palette</label><div className="palette-list">{definition.palettes.map((item, index) => <button key={item.name} className={paletteIndex === index ? "is-active" : ""} onClick={() => updatePalette(index)}><i style={{ background: item.bg }} />{item.colors.slice(0, 5).map((color) => <i key={color} style={{ background: color }} />)}<span>{item.name}</span></button>)}</div><div className="color-editor"><label title="Background color"><input type="color" value={palette.bg} onInput={(event) => updatePaletteColor("bg", 0, event.currentTarget.value)} /><span>BG</span></label>{palette.colors.map((color, index) => <label key={`color-${index}`} title={`Custom color ${index + 1}`}><input type="color" value={color} onInput={(event) => updatePaletteColor("color", index, event.currentTarget.value)} /><span>{String(index + 1).padStart(2, "0")}</span></label>)}</div></div>
          <div className="control-block parameter-list"><label>04 / Structure</label>{definition.parameters.map((item) => {
            const frameLocked = isTote && item.key === "frame";
            const value = frameLocked ? 0 : state.parametersBySeriesId[state.seriesId][item.key];
            return item.options
              ? <div className="range-control" key={item.key}><span>{item.label}</span><select value={value} onChange={(event) => updateParameter(item.key, event.target.value)}>{item.options.map((option) => <option key={option}>{option}</option>)}</select></div>
              : <div className={frameLocked ? "range-control is-disabled" : "range-control"} key={item.key}><span>{item.label}</span><output>{value}</output><input type="range" min={item.min} max={item.max} step={item.step} value={value} disabled={frameLocked} aria-label={frameLocked ? "Frame is disabled for tote bags" : item.label} onChange={(event) => updateParameter(item.key, Number(event.target.value))} /></div>;
          })}</div>
        </aside>
        <section className="studio-preview"><PatternCanvas key={state.seriesId} state={state} onEngine={(value) => { engine.current = value; }} /><div className="preview-meta"><span>{state.seriesId.toUpperCase()} / {format.widthIn}:{format.heightIn}</span><button onClick={() => engine.current?.exportFlatPattern({ maxEdge: 2400, label: "proof" })}><Download size={15} /> Export proof</button></div></section>
        <aside className="make-panel"><p className="index-label">MAKE IT PHYSICAL</p><h2>{definition.name}</h2><div className="option-group"><label>Object</label><div className="stacked-options">{PRODUCT_TYPES.map((item) => <button key={item.id} className={product.id === item.id ? "is-active" : ""} onClick={() => { setProduct(item); setPreviewStatus(""); }}><span>{item.name}</span><small>{item.description}</small></button>)}</div></div><div className="option-group"><label>Size</label><select value={size} onChange={(event) => setSize(event.target.value)}>{product.sizes.map((item) => <option key={item}>{item}</option>)}</select></div>{isTote && <div className="option-group"><label>Handle color</label><select value={handleColor} onChange={(event) => setHandleColor(event.target.value)}>{product.handleColors.map((color) => <option key={color}>{color}</option>)}</select></div>}<div className="print-spec"><span>Print target</span><strong>{format.width} × {format.height} px</strong><small>RGB / {format.dpi} DPI · prepared after you leave Studio</small></div><button className="add-button" onClick={previewProduct} disabled={previewing}><span>{previewing ? "Preparing preview…" : "Preview product"}</span><strong>{money.format(productPrice(product.id, size))}</strong></button>{previewStatus && <output className="preview-status">{previewStatus}</output>}<p className="fine-print">The production file stays behind the scenes. The next screen shows only Printify’s rendered product mockups.</p></aside>
        <div className="mobile-studio-controls">
          <div className="mobile-control-row">
            <label><span>Series</span><select value={state.seriesId} onChange={(event) => updateSeries(event.target.value)}>{SERIES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <button onClick={randomizeAll}><Dices size={15} /><span>Shuffle</span></button>
            <button onClick={cyclePalette}><span className="mobile-palette-dots" aria-hidden="true">{palette.colors.slice(0, 3).map((color) => <i key={color} style={{ background: color }} />)}</span><span>Palette</span></button>
            <button className={advancedOpen ? "is-active" : ""} onClick={() => setAdvancedOpen((value) => !value)} aria-expanded={advancedOpen} aria-controls="mobile-advanced-controls"><SlidersHorizontal size={15} /><span>Advanced</span></button>
          </div>
          <div className={advancedOpen ? "mobile-advanced-panel is-open" : "mobile-advanced-panel"} id="mobile-advanced-controls" aria-hidden={!advancedOpen}>
            {definition.parameters.filter((item) => !item.options).map((item) => {
              const frameLocked = isTote && item.key === "frame";
              const value = frameLocked ? 0 : state.parametersBySeriesId[state.seriesId][item.key];
              return <div className={frameLocked ? "range-control is-disabled" : "range-control"} key={item.key}><span>{item.label}</span><output>{value}</output><input type="range" min={item.min} max={item.max} step={item.step} value={value} disabled={frameLocked} aria-label={frameLocked ? "Frame is disabled for tote bags" : item.label} onChange={(event) => updateParameter(item.key, Number(event.target.value))} /></div>;
            })}
          </div>
          <div className={isTote ? "mobile-product-row has-handle-color" : "mobile-product-row"}><label><span>Object</span><select value={product.id} onChange={(event) => setProduct(PRODUCT_TYPES.find((item) => item.id === event.target.value) ?? PRODUCT_TYPES[0])}>{PRODUCT_TYPES.map((item) => <option value={item.id} key={item.id}>{item.short}</option>)}</select></label><label><span>Size</span><select value={size} onChange={(event) => setSize(event.target.value)}>{product.sizes.map((item) => <option key={item}>{item}</option>)}</select></label>{isTote && <label><span>Handles</span><select value={handleColor} onChange={(event) => setHandleColor(event.target.value)}>{product.handleColors.map((color) => <option key={color}>{color}</option>)}</select></label>}</div>
          <button className="add-button mobile-add-button" onClick={previewProduct} disabled={previewing}><span>{previewing ? "Preparing preview…" : "Preview product"}</span><strong>{money.format(productPrice(product.id, size))}</strong></button>
        </div>
      </div>
      <CuratedRecipesSection items={curated} onSelect={selectCurated} activeSeed={state.seed} />
    </main>
  );
}

function PreviewPage({ draft, onBack, onAdd }) {
  const [result, setResult] = React.useState({ phase: draft ? "uploading" : "missing", message: "", preview: null });
  const [activeMockup, setActiveMockup] = React.useState(0);
  const [adding, setAdding] = React.useState(false);

  React.useEffect(() => {
    if (!draft?.blob) return undefined;
    const controller = new AbortController();
    let timer;
    let attempts = 0;

    const poll = async (preview) => {
      attempts += 1;
      const query = new URLSearchParams({ task_id: preview.taskId });
      const response = await fetch(`/api/printify/product-preview/status?${query}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Printify preview status is unavailable");
      if (payload.status === "completed") {
        setResult({ phase: "completed", message: "", preview: { ...preview, ...payload } });
        return;
      }
      if (payload.status === "failed" || payload.status === "corrupt") {
        throw new Error("Printify could not render this product preview");
      }
      if (attempts >= 45) throw new Error("Printify is taking longer than expected. Try the preview again.");
      setResult({ phase: "rendering", message: "Printify is rendering your product mockups…", preview });
      timer = window.setTimeout(() => poll(preview).catch(fail), 1800);
    };

    const fail = (error) => {
      if (error?.name === "AbortError") return;
      setResult({ phase: "error", message: error?.message || "We couldn’t generate this product preview. Please try again.", preview: null });
    };

    const start = async () => {
      try {
        const response = await fetch("/api/printify/product-preview", {
          method: "POST",
          headers: {
            "Content-Type": "image/png",
            "X-Haptique-Filename": draft.filename,
            "X-Haptique-Preview-Id": `haptique-${crypto.randomUUID()}`,
            "X-Haptique-Product": draft.productId,
            "X-Haptique-Size": draft.size,
            ...(draft.handleColor ? { "X-Haptique-Handle-Color": draft.handleColor } : {}),
          },
          body: draft.blob,
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.taskId) {
          throw new Error("Printify could not start the product preview");
        }
        setResult({ phase: "rendering", message: "Printify is rendering your product mockups…", preview: payload });
        await poll(payload);
      } catch (error) {
        fail(error);
      }
    };

    start();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft]);

  const mockups = (result.preview?.mockups ?? [])
    .filter((item) => item?.src);
  const mockup = mockups[activeMockup] ?? mockups[0];
  const ready = result.phase === "completed" && Boolean(mockup?.src);
  const add = async () => {
    if (!ready) return;
    setAdding(true);
    try {
      const response = await fetch("/api/printify/product-preview/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: result.preview.taskId }),
      });
      const personalization = await response.json();
      if (
        !response.ok
        || (
          personalization.fulfillmentStrategy !== "custom_product"
          && !personalization.personalisationInstructions
        )
      ) {
        throw new Error("Personalization could not be saved");
      }
      onAdd({
        lineId: crypto.randomUUID(),
        seriesId: draft.seriesId,
        seriesName: draft.seriesName,
        seed: draft.seed,
        designHash: draft.designHash,
        productId: draft.productId,
        productName: draft.productName,
        size: draft.size,
        handleColor: draft.handleColor,
        price: draft.price,
        quantity: 1,
        mockupUrl: primaryMockupUrl(mockups),
        aspectRatio: draft.aspectRatio,
        printSpec: draft.printSpec,
        printifyProductId: result.preview.productId,
        printifyUploadId: result.preview.uploadId,
        printifyFulfillmentStrategy: personalization.fulfillmentStrategy ?? "personalization",
        personalizationStrategy: personalization.personalisationStrategy,
        personalizationInstructions: personalization.personalisationInstructions,
      });
    } catch {
      setResult((current) => ({ ...current, phase: "error", message: "Your preview is ready, but it could not be added to cart. Please try again." }));
    } finally {
      setAdding(false);
    }
  };

  if (!draft) {
    return <main className="product-preview-page is-missing"><p className="index-label">PREVIEW / EXPIRED</p><h1>Return to the studio<br />to build your product.</h1><button className="primary-text-link" onClick={onBack}>Back to studio <ArrowUpRight size={18} /></button></main>;
  }

  return (
    <main className="product-preview-page">
      <header className="product-preview-header"><div><p className="index-label">STUDIO / PREVIEW / CART</p><h1>Check the object.</h1></div></header>
      <div className="product-preview-layout">
        <section className="product-mockup-stage">
          {ready
            ? <div className="product-mockup-gallery"><img src={mockup.src} alt={`${draft.seriesName} pattern on ${draft.productName}`} />{mockups.length > 1 && <div className="product-mockup-thumbnails" aria-label="Product views">{mockups.map((item, index) => <button key={`${item.mockup_id}-${index}`} className={index === activeMockup ? "is-active" : ""} onClick={() => setActiveMockup(index)} aria-label={`Show ${item.mockup_id || `view ${index + 1}`}`}><img src={item.src} alt="" /></button>)}</div>}</div>
            : result.phase === "error"
              ? <div className="product-mockup-fallback"><p>We couldn’t generate the product mockups.<br />Return to Studio and try again.</p></div>
              : <div className="product-mockup-loading"><div className="preview-spinner" aria-hidden="true" /><p>{result.phase === "uploading" ? "Preparing your product preview…" : result.message || "Preparing preview…"}</p></div>}
          <div className="product-mockup-caption"><span>PRINTIFY PRODUCT PREVIEW</span><span>{ready ? mockup.mockup_id || "PRODUCT VIEW" : result.phase.toUpperCase()}</span></div>
        </section>
        <aside className="product-preview-summary">
          <p className="index-label">{draft.productName.toUpperCase()} / {draft.size}</p>
          <h2>{draft.seriesName}</h2>
          <div className="product-preview-details"><span>Object</span><strong>{draft.productName}</strong><span>Size</span><strong>{draft.size}</strong>{draft.handleColor && <><span>Handles</span><strong>{draft.handleColor}</strong></>}<span>Price</span><strong>{money.format(draft.price)}</strong></div>
          {result.phase === "error" && <div className="preview-error" role="alert"><strong>Mockups couldn’t be generated</strong><p>{result.message || "We couldn’t generate this product preview."}</p><button onClick={onBack}>Return to studio</button></div>}
          {ready && <div className="preview-approved"><Check size={17} /><span>Personalization rendered by Printify</span></div>}
          <button className="add-button preview-add-button" onClick={add} disabled={!ready || adding}><span>{adding ? "Adding…" : ready ? "Add to cart" : "Waiting for preview"}</span><strong>{money.format(draft.price)}</strong></button>
          <button className="preview-back-button" onClick={onBack}>Back to Studio</button>
          <p className="fine-print">This page displays Printify’s rendered mockups. Production artwork remains hidden and is attached to the cart item for fulfillment.</p>
        </aside>
      </div>
    </main>
  );
}

function decodeSafeSeed(hash) { try { return decodePatternShare(hash).seed; } catch { return 0; } }

function AboutPage({ patternState }) {
  const copy = SITE_CONTENT.about;
  const [showCloth, setShowCloth] = React.useState(false);
  const actions = React.useRef(null);
  return (
    <main className="about-page">
      <section className="about-intro"><p className="index-label">{copy.eyebrow}</p><h1>{copy.title[0]}<br />{copy.title[1]}</h1><p className="about-lede">{copy.lede}</p></section>
      <section className="about-manifesto">{copy.manifesto.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      <section className="cloth-invitation"><div><p className="index-label">{copy.clothEyebrow}</p><h2>{copy.clothTitle[0]}<br />{copy.clothTitle[1]}</h2></div><button onClick={() => setShowCloth(true)}>{copy.clothCta} <ArrowUpRight size={17} /></button></section>
      {showCloth && <div className="cloth-modal" role="dialog" aria-modal="true" aria-label="Interactive 3D cloth"><button className="cloth-close" onClick={() => setShowCloth(false)}><X size={20} /> Close</button><div className="cloth-scene"><React.Suspense fallback={<div className="cloth-loading">Loading the original cloth…</div>}><LazyClothExperience patternState={patternState} studioActionsRef={actions} onZoomChange={() => {}} /></React.Suspense></div><p className="cloth-hint">Drag the fabric. Scroll to move closer.</p></div>}
    </main>
  );
}

function CartArtwork({ item, active }) {
  const restoredState = React.useMemo(() => {
    if (item.image || !active) return null;
    try {
      const aspectRatio = item.aspectRatio || 1;
      return {
        ...applyPatternSnapshot(createDefaultPatternState(), decodePatternShare(item.designHash)),
        width: 240,
        height: Math.max(1, Math.round(240 / aspectRatio)),
      };
    } catch {
      return null;
    }
  }, [active, item.aspectRatio, item.designHash, item.image, item.mockupUrl]);

  if (item.mockupUrl) return <img src={item.mockupUrl} alt={`${item.seriesName} tote preview`} />;
  if (item.image) return <img src={item.image} alt={`${item.seriesName} pattern`} />;
  if (restoredState) return <PatternCanvas state={restoredState} className="cart-pattern-preview" />;
  return null;
}

function CartDrawer({ items, open, onClose, onChange, onRemove }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [message, setMessage] = React.useState("");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const checkout = async () => {
    setCheckingOut(true);
    setMessage("Opening secure Stripe checkout…");
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: crypto.randomUUID(),
          items: items.map(({ productId, size, handleColor, quantity, designHash, seed, seriesId, seriesName, printifyProductId, printifyUploadId, printifyFulfillmentStrategy, personalizationStrategy, personalizationInstructions }) => ({
            productId,
            size,
            handleColor,
            quantity,
            designHash,
            seed,
            seriesId,
            seriesName,
            printifyProductId,
            printifyUploadId,
            printifyFulfillmentStrategy,
            personalizationStrategy,
            personalizationInstructions,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout could not be started");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error.message || "Checkout could not be started");
      setCheckingOut(false);
    }
  };
  return <><button className={open ? "cart-scrim is-open" : "cart-scrim"} onClick={onClose} aria-label="Close cart" /><aside className={open ? "cart-drawer is-open" : "cart-drawer"} aria-hidden={!open}><header><p>YOUR CART / {String(items.length).padStart(2, "0")}</p><button onClick={onClose} aria-label="Close cart"><X /></button></header>{items.length ? <><div className="cart-items">{items.map((item) => <article className="cart-line" key={item.lineId}><div className="cart-thumb" style={{ aspectRatio: item.aspectRatio || 1 }}><CartArtwork item={item} active={open} /></div><div><h3>{item.seriesName}</h3><p>{item.productName}<br />{item.size}{item.handleColor ? <><br />{item.handleColor} handles</> : null}<br />{item.printSpec?.width} × {item.printSpec?.height} px</p><div className="quantity"><button onClick={() => onChange(item.lineId, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => onChange(item.lineId, 1)}><Plus size={13} /></button></div><button className="remove" onClick={() => onRemove(item.lineId)}>Remove</button></div><strong>{money.format(item.price * item.quantity)}</strong></article>)}</div><footer><div><span>Subtotal</span><strong>{money.format(total)}</strong></div><p>US delivery details are collected in secure checkout.</p><button className="checkout-button" onClick={checkout} disabled={checkingOut}>{checkingOut ? "Opening Stripe…" : "Checkout"} <ArrowUpRight size={17} /></button>{message && <output>{message}</output>}</footer></> : <div className="empty-cart"><ShoppingBag size={30} strokeWidth={1.2} /><p>Your future object<br />is still a recipe.</p><button onClick={onClose}>Keep looking</button></div>}</aside></>;
}

function Footer() {
  const copy = SITE_CONTENT.footer;
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/logoB.svg" alt="Haptique" />
        <p>{copy.tagline[0]}<br />{copy.tagline[1]}</p>
      </div>
      <div className="footer-details">
        <section><p>CONTACT</p><a href={`mailto:${copy.contactEmail}`}>{copy.contactEmail}</a></section>
        <section><p>FOLLOW</p>{copy.socialLinks.map((link) => <a href={link.href} target="_blank" rel="noreferrer" key={link.href}>{link.label}</a>)}</section>
        <section><p>MADE</p><span>{copy.made[0]}<br />{copy.made[1]}</span></section>
      </div>
      <div className="footer-bottom"><span>{copy.copyright}</span><span>{copy.signoff}</span></div>
    </footer>
  );
}

function CheckoutConfirmationModal({ sessionId, onClose }) {
  const [result, setResult] = React.useState({ phase: "loading", order: null, testMode: true });

  React.useEffect(() => {
    let canceled = false;
    let timer;
    let attempts = 0;

    const checkStatus = async () => {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/stripe/checkout/status?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { Accept: "application/json" } },
        );
        const payload = await response.json();
        if (canceled) return;
        if (response.ok) {
          const paid = payload.paymentStatus === "paid";
          setResult({
            phase: paid ? "paid" : "processing",
            order: payload.order,
            testMode: payload.testMode,
          });
          if (paid) return;
        }
      } catch {
        if (!canceled) setResult((current) => ({ ...current, phase: "processing" }));
      }

      if (!canceled) {
        if (attempts >= 8) {
          setResult((current) => ({ ...current, phase: "delayed" }));
        }
        const delay = attempts < 8 ? 1250 : Math.min(10000, 2500 + (attempts - 8) * 750);
        timer = window.setTimeout(checkStatus, delay);
      }
    };

    checkStatus();
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [sessionId]);

  React.useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const paid = result.phase === "paid";
  const order = result.order;
  const reference = order?.reference?.slice(0, 8).toUpperCase();
  const itemCount = order?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <div className="confirmation-modal-scrim">
      <section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <header>
          <p>ORDER CONFIRMATION / {reference || "PENDING"}</p>
          <button onClick={onClose} aria-label="Close confirmation"><X size={18} /></button>
        </header>
        <div className={paid ? "confirmation-modal-mark is-paid" : "confirmation-modal-mark"}>
          {paid ? <Check size={32} strokeWidth={1.5} /> : <span aria-hidden="true">•••</span>}
        </div>
        <h2 id="confirmation-title">{paid ? "Your order is in motion." : "We’re confirming your payment."}</h2>
        <p className="confirmation-modal-copy">
          {paid
            ? "Payment confirmed. We’ll validate your artwork, prepare the production file, and move your piece into made-to-order production."
            : "Your checkout returned successfully. We’re waiting for Stripe’s signed confirmation before releasing the order."}
        </p>
        {order && (
          <div className="confirmation-modal-meta">
            <span>REFERENCE <b>#{reference}</b></span>
            <span>{itemCount} ITEM{itemCount === 1 ? "" : "S"}</span>
            <strong>{money.format(order.amountSubtotal / 100)}</strong>
          </div>
        )}
        {result.testMode && <p className="confirmation-modal-sandbox">TEST ORDER — NO PHYSICAL ITEM WILL BE PRODUCED</p>}
        <div className="confirmation-modal-actions">
          <button className="confirmation-modal-return" onClick={onClose} autoFocus>Back to Haptique <ArrowUpRight size={17} /></button>
        </div>
      </section>
    </div>
  );
}

export function HaptiqueApp() {
  const initialCheckoutParams = new URLSearchParams(window.location.search);
  const initialCheckoutResult = initialCheckoutParams.get("checkout");
  const checkoutSessionId = initialCheckoutParams.get("session_id");
  const [checkoutResult, setCheckoutResult] = React.useState(initialCheckoutResult);
  const [route, setRoute] = React.useState(() => {
    const initialRoute = routeFromLocation(window.location);
    if (!hasDesignHash(window.location.hash)) return initialRoute;
    try {
      const snapshot = decodePatternShare(window.location.href);
      return { page: "studio", seriesId: snapshot.seriesId || null };
    } catch {
      return initialRoute;
    }
  });
  const [pageTransition, setPageTransition] = React.useState("idle");
  const transitionTimer = React.useRef(null);
  const [patternState, setPatternState] = React.useState(() => {
    const initialState = createDefaultPatternState();
    const initialRoute = routeFromLocation(window.location);
    if (!hasDesignHash(window.location.hash)) {
      return initialRoute.page === "studio" && initialRoute.seriesId
        ? { ...initialState, seriesId: initialRoute.seriesId }
        : initialState;
    }
    try {
      return applyPatternSnapshot(initialState, decodePatternShare(window.location.href));
    } catch {
      return initialState;
    }
  });
  const [cart, setCart] = React.useState(loadStoredCart);
  const [previewDraft, setPreviewDraft] = React.useState(null);
  const [cartOpen, setCartOpen] = React.useState(
    initialCheckoutResult === "canceled" && cart.length > 0,
  );
  const [confirmationOpen, setConfirmationOpen] = React.useState(
    initialCheckoutResult === "success" && Boolean(checkoutSessionId),
  );
  const page = route.page;
  const selectedSeries = CAMPAIGN_SERIES_BY_ID[route.seriesId] ?? CAMPAIGN_SERIES[0];

  React.useEffect(() => {
    const canonicalRoute = route.page === "studio"
      ? { ...route, seriesId: route.seriesId || patternState.seriesId }
      : route;
    const canonicalPath = pathForRoute(canonicalRoute);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, "", `${canonicalPath}${window.location.search}${window.location.hash}`);
    }
  }, []);

  React.useEffect(() => {
    document.title = titleForRoute(route);
  }, [route]);

  React.useEffect(() => {
    storeCart(cart);
  }, [cart]);

  React.useEffect(() => {
    const restoreLocation = () => {
      window.clearTimeout(transitionTimer.current);
      setPageTransition("idle");
      let nextRoute = routeFromLocation(window.location);
      if (hasDesignHash(window.location.hash)) {
        try {
          const snapshot = decodePatternShare(window.location.href);
          setPatternState((current) => applyPatternSnapshot(current, snapshot));
          nextRoute = { page: "studio", seriesId: snapshot.seriesId || null };
        } catch {
          nextRoute = { page: "studio", seriesId: null };
        }
      } else if (nextRoute.page === "studio" && nextRoute.seriesId) {
        setPatternState((current) => ({ ...current, seriesId: nextRoute.seriesId }));
      }
      setRoute(nextRoute);
      setCartOpen(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", restoreLocation);
    window.addEventListener("hashchange", restoreLocation);
    return () => {
      window.clearTimeout(transitionTimer.current);
      window.removeEventListener("popstate", restoreLocation);
      window.removeEventListener("hashchange", restoreLocation);
    };
  }, []);

  const add = (item) => { setCart((items) => [...items, item]); setCartOpen(true); };
  const quantity = (lineId, amount) => setCart((items) => items.map((item) => item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  const navigate = (target, seriesId = null, { scroll = true } = {}) => {
    setCartOpen(false);
    const nextRoute = routeForPage(target, seriesId);
    const nextPath = pathForRoute(nextRoute);
    if (target !== page && pageTransition !== "idle") return;
    if (window.location.pathname !== nextPath || window.location.search || window.location.hash) {
      window.history.pushState({}, "", nextPath);
    }
    if (target === page) {
      setRoute(nextRoute);
      if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRoute(nextRoute);
      if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    setPageTransition("leaving");
    transitionTimer.current = window.setTimeout(() => {
      setRoute(nextRoute);
      if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
      setPageTransition("entering");
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPageTransition("idle")));
    }, PAGE_TRANSITION_MS);
  };
  const openStudio = (seriesId, recipeHash) => {
    setPatternState((current) => {
      if (!recipeHash) return { ...current, seriesId };
      try {
        return applyPatternSnapshot(current, decodePatternShare(recipeHash));
      } catch {
        return { ...current, seriesId };
      }
    });
    navigate("studio", seriesId);
  };
  const openSeries = (seriesId) => {
    navigate("series", seriesId);
  };
  const openPreview = (draft) => {
    setPreviewDraft(draft);
    navigate("preview");
  };
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const dismissCheckoutResult = () => {
    window.history.replaceState({}, "", window.location.pathname);
    setCheckoutResult(null);
    setConfirmationOpen(false);
  };
  return <div className={`haptique-site is-${pageTransition}`} aria-busy={pageTransition !== "idle"}>{checkoutResult === "canceled" && <div className="checkout-notice is-canceled" role="status"><span>Stripe checkout canceled. No payment was confirmed.</span><button onClick={dismissCheckoutResult} aria-label="Dismiss checkout message"><X size={15} /></button></div>}<Header page={page} onNavigate={navigate} cartCount={count} onCart={() => setCartOpen(true)} />{page === "shop" && <ShopPage onOpenStudio={openStudio} onOpenSeries={openSeries} />}{page === "series" && <SeriesPage series={selectedSeries} onOpenStudio={openStudio} />}{page === "studio" && <StudioPage state={patternState} setState={setPatternState} onPreview={openPreview} onSeriesChange={(seriesId) => navigate("studio", seriesId, { scroll: false })} />}{page === "preview" && <PreviewPage draft={previewDraft} onBack={() => navigate("studio", patternState.seriesId)} onAdd={add} />}{page === "about" && <AboutPage patternState={patternState} />}<Footer /><CartDrawer items={cart} open={cartOpen} onClose={() => setCartOpen(false)} onChange={quantity} onRemove={(lineId) => setCart((items) => items.filter((item) => item.lineId !== lineId))} />{confirmationOpen && checkoutSessionId && <CheckoutConfirmationModal sessionId={checkoutSessionId} onClose={dismissCheckoutResult} />}</div>;
}
