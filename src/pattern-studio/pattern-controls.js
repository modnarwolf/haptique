import * as React from "react";
import { useDialKitController } from "dialkit";
import { PRINT_PRESETS, SERIES, SERIES_BY_ID, getPalette } from "./pattern-data.js";

const paletteFolderName = (seriesId) => `Palette — ${SERIES_BY_ID[seriesId].name}`;
const colorFolderName = (paletteName) => `Colors — ${paletteName}`;
const compositionFolderName = (seriesId) => `Composition — ${SERIES_BY_ID[seriesId].name}`;

function createPatternConfig(state) {
  const seriesId = state.seriesId;
  const series = SERIES_BY_ID[seriesId];
  const palette = getPalette(state);
  const selectedPalette = series.palettes[state.paletteIndexesBySeriesId[seriesId]];
  const paletteFolder = paletteFolderName(seriesId);
  const colorFolder = colorFolderName(selectedPalette.name);
  const compositionFolder = compositionFolderName(seriesId);
  const colorControls = { Ground: palette.bg };
  palette.colors.forEach((color, index) => {
    colorControls[`Color ${index + 1}`] = color;
  });

  const compositionControls = {};
  for (const parameter of series.parameters) {
    compositionControls[parameter.key] = parameter.options
      ? {
          type: "select",
          label: parameter.label,
          options: parameter.options,
          default: state.parametersBySeriesId[seriesId][parameter.key],
        }
      : [state.parametersBySeriesId[seriesId][parameter.key], parameter.min, parameter.max, parameter.step];
  }

  return {
    Series: {
      type: "select",
      options: SERIES.map((item) => ({ value: item.id, label: item.name })),
      default: seriesId,
    },
    seed: [state.seed, 0, 999999, 1],
    printSize: {
      preset: { type: "select", options: Object.keys(PRINT_PRESETS), default: state.printPreset },
      width: [state.width, 100, 20000, 10],
      height: [state.height, 100, 20000, 10],
      applyPrintSize: { type: "action", label: "Set print size" },
    },
    [paletteFolder]: {
      preset: {
        type: "select",
        options: series.palettes.map((item) => item.name),
        default: selectedPalette.name,
      },
      [colorFolder]: colorControls,
      shufflePalette: { type: "action", label: "Shuffle colors" },
      revertPalette: { type: "action", label: "Revert palette" },
    },
    [compositionFolder]: compositionControls,
    newSeed: { type: "action", label: "New seed" },
    exportFlatPattern: { type: "action", label: "Export flat pattern" },
    exportCloth: { type: "action", label: "Export 3D cloth" },
    exportClothClear: { type: "action", label: "Export 3D cloth (no background)" },
    resetCloth: { type: "action", label: "Reset cloth" },
    resetFlatCloth: { type: "action", label: "Reset Flat" },
  };
}

function paletteControlUpdates(state) {
  const palette = getPalette(state);
  const series = SERIES_BY_ID[state.seriesId];
  const paletteName = series.palettes[state.paletteIndexesBySeriesId[state.seriesId]].name;
  const values = { Ground: palette.bg };
  palette.colors.forEach((color, index) => {
    values[`Color ${index + 1}`] = color;
  });
  return {
    [paletteFolderName(state.seriesId)]: {
      preset: paletteName,
      [colorFolderName(paletteName)]: values,
    },
  };
}

export function PatternStudioControls({ engine, scene, state, onStateChange }) {
  const setState = onStateChange;
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const controllerRef = React.useRef(null);
  const controller = useDialKitController("Pattern Studio", createPatternConfig(state), {
    id: "haptique-pattern-studio",
    persist: true,
    onAction: (path) => {
      const action = path.split(".").pop();
      const current = stateRef.current;
      const values = controllerRef.current?.getValues();
      if (action === "newSeed") {
        controllerRef.current?.setValues({ seed: Math.floor(Math.random() * 1000000) });
      } else if (action === "applyPrintSize") {
        const presetName = values?.printSize?.preset ?? current.printPreset;
        const preset = PRINT_PRESETS[presetName];
        const width = Math.max(
          100,
          Math.min(20000, Math.round(preset?.[0] ?? values?.printSize?.width ?? current.width)),
        );
        const height = Math.max(
          100,
          Math.min(20000, Math.round(preset?.[1] ?? values?.printSize?.height ?? current.height)),
        );
        controllerRef.current?.setValues({ printSize: { width, height } });
        setState({ ...current, printPreset: presetName, width, height });
      } else if (action === "shufflePalette" || action === "revertPalette") {
        const paletteIndex = current.paletteIndexesBySeriesId[current.seriesId];
        const preset = SERIES_BY_ID[current.seriesId].palettes[paletteIndex];
        const colors = action === "revertPalette"
          ? [...preset.colors]
          : [...current.paletteValuesBySeriesId[current.seriesId].colors].sort(() => Math.random() - 0.5);
        const paletteValuesBySeriesId = {
          ...current.paletteValuesBySeriesId,
          [current.seriesId]: {
            bg: action === "revertPalette"
              ? preset.bg
              : current.paletteValuesBySeriesId[current.seriesId].bg,
            colors,
          },
        };
        const nextState = { ...current, paletteValuesBySeriesId };
        setState(nextState);
        queueMicrotask(() => controllerRef.current?.setValues(paletteControlUpdates(nextState)));
      } else if (action === "exportFlatPattern") {
        engine?.exportFlatPattern().catch((error) => {
          console.error("[haptique] flat pattern export failed", error);
        });
      } else if (action === "exportCloth") {
        scene?.exportPNG(false);
      } else if (action === "exportClothClear") {
        scene?.exportPNG(true);
      } else if (action === "resetCloth") {
        scene?.resetCloth();
      } else if (action === "resetFlatCloth") {
        scene?.resetFlatCloth();
      }
    },
  });
  controllerRef.current = controller;

  React.useEffect(() => {
    const values = controller.values;
    if (SERIES_BY_ID[values.Series] && values.Series !== state.seriesId) {
      setState({ ...state, seriesId: values.Series });
      return;
    }

    const seriesId = state.seriesId;
    const series = SERIES_BY_ID[seriesId];
    const paletteFolder = values[paletteFolderName(seriesId)];
    const selectedName = paletteFolder?.preset;
    const selectedIndex = series.palettes.findIndex((item) => item.name === selectedName);
    if (selectedIndex >= 0 && selectedIndex !== state.paletteIndexesBySeriesId[seriesId]) {
      const selectedPalette = series.palettes[selectedIndex];
      setState({
        ...state,
        paletteIndexesBySeriesId: { ...state.paletteIndexesBySeriesId, [seriesId]: selectedIndex },
        paletteValuesBySeriesId: {
          ...state.paletteValuesBySeriesId,
          [seriesId]: { bg: selectedPalette.bg, colors: [...selectedPalette.colors] },
        },
      });
      return;
    }

    const selectedPalette = series.palettes[state.paletteIndexesBySeriesId[seriesId]];
    const colorValues = paletteFolder?.[colorFolderName(selectedPalette.name)];
    const nextPalette = colorValues
      ? {
          bg: colorValues.Ground,
          colors: state.paletteValuesBySeriesId[seriesId].colors.map(
            (color, index) => colorValues[`Color ${index + 1}`] ?? color,
          ),
        }
      : state.paletteValuesBySeriesId[seriesId];
    const compositionValues = values[compositionFolderName(seriesId)] ?? {};
    const nextParameters = { ...state.parametersBySeriesId[seriesId] };
    for (const parameter of series.parameters) {
      if (compositionValues[parameter.key] !== undefined) {
        nextParameters[parameter.key] = compositionValues[parameter.key];
      }
    }

    const nextState = {
      ...state,
      seed: Math.max(0, Math.min(999999, Math.round(values.seed ?? state.seed))),
      printPreset: values.printSize?.preset ?? state.printPreset,
      parametersBySeriesId: { ...state.parametersBySeriesId, [seriesId]: nextParameters },
      paletteValuesBySeriesId: { ...state.paletteValuesBySeriesId, [seriesId]: nextPalette },
    };
    if (JSON.stringify(nextState) !== JSON.stringify(state)) setState(nextState);
  }, [controller.values, state]);

  React.useEffect(() => {
    engine?.setState(state);
  }, [engine, state]);

  return null;
}
