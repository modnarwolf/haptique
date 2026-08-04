import * as React from "react";
import { createDefaultPatternState } from "../pattern-studio/pattern-data.js";
import { PatternPainter } from "../pattern-studio/pattern-renderer.js";
import { applyPatternSnapshot, decodePatternShare } from "../pattern-studio/pattern-share.js";

const THUMBNAIL_WIDTH = 360;
const THUMBNAIL_HEIGHT = 480;
const RENDER_VERSION = "360x480-png";

export function useCuratedPatternPreviews(items) {
  const [previews, setPreviews] = React.useState({});
  const previewCacheRef = React.useRef(new Map());
  const itemKey = React.useMemo(
    () => items.map((item) => `${item.id}:${item.hash}`).join("|"),
    [items],
  );

  React.useEffect(() => {
    if (!items.length || !window.p5) {
      return undefined;
    }

    const cacheKey = (item) => `${RENDER_VERSION}:${item.hash}`;
    const cachedPreviews = Object.fromEntries(
      items.flatMap((item) => {
        const dataUrl = previewCacheRef.current.get(cacheKey(item));
        return dataUrl ? [[item.id, dataUrl]] : [];
      }),
    );
    const itemsToRender = items.filter((item) => !previewCacheRef.current.has(cacheKey(item)));
    if (Object.keys(cachedPreviews).length) {
      setPreviews((current) => ({ ...current, ...cachedPreviews }));
    }
    if (!itemsToRender.length) return undefined;

    let cancelled = false;
    let frame = 0;

    const sketch = new window.p5((p5) => {
      p5.setup = () => {
        const renderer = p5.createCanvas(2, 2);
        renderer.elt.className = "curated-renderer-canvas";
        renderer.elt.setAttribute("aria-hidden", "true");
        p5.pixelDensity(1);
        p5.noLoop();
        const painter = new PatternPainter(p5);
        let index = 0;

        const renderNext = () => {
          if (cancelled || index >= itemsToRender.length) return;
          const item = itemsToRender[index];
          index += 1;
          const graphics = p5.createGraphics(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
          graphics.pixelDensity(1);
          try {
            const snapshot = decodePatternShare(item.hash);
            const state = applyPatternSnapshot(createDefaultPatternState(), snapshot);
            const thumbnailState = {
              ...state,
              width: THUMBNAIL_WIDTH,
              height: THUMBNAIL_HEIGHT,
            };
            painter.paint(graphics, thumbnailState, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, 1);
            const dataUrl = graphics.canvas.toDataURL("image/png");
            if (!cancelled) {
              previewCacheRef.current.set(cacheKey(item), dataUrl);
              setPreviews((current) => ({ ...current, [item.id]: dataUrl }));
            }
          } catch (error) {
            console.error(`[haptique] curated preview failed for ${item.id}`, error);
          } finally {
            graphics.remove();
          }
          frame = window.requestAnimationFrame(renderNext);
        };

        renderNext();
      };
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      sketch.remove();
    };
  }, [itemKey]);

  return previews;
}
