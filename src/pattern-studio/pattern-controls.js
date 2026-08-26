import * as React from "react";
import { useDialKitController } from "dialkit";
import { PARAMS, PRINT_PRESETS, SERIES, getPalette } from "./pattern-data.js";

const paletteFolderName = (series) => `Palette — ${SERIES[series].name}`;
const colorFolderName = (paletteName) => `Colors — ${paletteName}`;
const compositionFolderName = (series) => `Composition — ${SERIES[series].name}`;

function createPatternConfig(state) {
  const series = state.series;
  const palette = getPalette(state);
  const selectedPalette = SERIES[series].palettes[state.palettes[series]];
  const paletteFolder = paletteFolderName(series);
  const colorFolder = colorFolderName(selectedPalette.name);
  const compositionFolder = compositionFolderName(series);
  const colorControls = { Ground: palette.bg };
  palette.colors.forEach((color, index) => {
    colorControls[`Color ${index + 1}`] = color;
  });
  const compositionControls = {};
  for (const parameter of PARAMS[series]) {
    compositionControls[parameter.key] = parameter.options
      ? { type: "select", label: parameter.label, options: parameter.options, default: state.params[series][parameter.key] }
      : [state.params[series][parameter.key], parameter.min, parameter.max, parameter.step];
  }
  return {
    series: {
      type: "select",
      options: Object.entries(SERIES).map(([value, item]) => ({ value, label: item.name })),
      default: series,
    },
    seed: [state.seed, 0, 999999, 1],
    printSize: {
      preset: { type: "select", options: Object.keys(PRINT_PRESETS), default: state.printPreset },
      width: [state.width, 100, 20000, 1],
      height: [state.height, 100, 20000, 1],
      applyPrintSize: { type: "action", label: "Set print size" },
    },
    [paletteFolder]: {
      preset: {
        type: "select",
        options: SERIES[series].palettes.map((item) => item.name),
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
  const paletteName = SERIES[state.series].palettes[state.palettes[state.series]].name;
  const values = { Ground: palette.bg };
  palette.colors.forEach((color, index) => {
    values[`Color ${index + 1}`] = color;
  });
  return {
    [paletteFolderName(state.series)]: {
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
        const width = Math.max(100, Math.min(20000, Math.round(preset?.[0] ?? values?.printSize?.width ?? current.width)));
        const height = Math.max(100, Math.min(20000, Math.round(preset?.[1] ?? values?.printSize?.height ?? current.height)));
        controllerRef.current?.setValues({ printSize: { width, height } });
        setState({ ...current, printPreset: presetName, width, height });
      } else if (action === "shufflePalette" || action === "revertPalette") {
        const paletteIndex = current.palettes[current.series];
        const preset = SERIES[current.series].palettes[paletteIndex];
        const colors = action === "revertPalette"
          ? [...preset.colors]
          : [...current.paletteValues[current.series].colors].sort(() => Math.random() - 0.5);
        const paletteValues = {
          ...current.paletteValues,
          [current.series]: { bg: action === "revertPalette" ? preset.bg : current.paletteValues[current.series].bg, colors },
        };
        const next = { ...current, paletteValues };
        setState(next);
        queueMicrotask(() => controllerRef.current?.setValues(paletteControlUpdates(next)));
      } else if (action === "exportFlatPattern") {
        engine?.exportFlatPattern().catch((error) => console.error("[haptique] flat pattern export failed", error));
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
    if (values.series !== state.series) {
      setState({ ...state, series: values.series });
      return;
    }
    const series = state.series;
    const paletteFolder = values[paletteFolderName(series)];
    const selectedName = paletteFolder?.preset;
    const selectedIndex = SERIES[series].palettes.findIndex((item) => item.name === selectedName);
    if (selectedIndex >= 0 && selectedIndex !== state.palettes[series]) {
      const selected = SERIES[series].palettes[selectedIndex];
      setState({
        ...state,
        palettes: { ...state.palettes, [series]: selectedIndex },
        paletteValues: {
          ...state.paletteValues,
          [series]: { bg: selected.bg, colors: [...selected.colors] },
        },
      });
      return;
    }

    const selectedPalette = SERIES[series].palettes[state.palettes[series]];
    const colorValues = paletteFolder?.[colorFolderName(selectedPalette.name)];
    const nextPalette = colorValues
      ? {
          bg: colorValues.Ground,
          colors: state.paletteValues[series].colors.map((color, index) => colorValues[`Color ${index + 1}`] ?? color),
        }
      : state.paletteValues[series];
    const compositionValues = values[compositionFolderName(series)] ?? {};
    const nextParams = { ...state.params[series] };
    for (const parameter of PARAMS[series]) {
      if (compositionValues[parameter.key] !== undefined) nextParams[parameter.key] = compositionValues[parameter.key];
    }
    const next = {
      ...state,
      seed: Math.max(0, Math.min(999999, Math.round(values.seed ?? state.seed))),
      printPreset: values.printSize?.preset ?? state.printPreset,
      params: { ...state.params, [series]: nextParams },
      paletteValues: { ...state.paletteValues, [series]: nextPalette },
    };
    if (JSON.stringify(next) !== JSON.stringify(state)) setState(next);
  }, [controller.values, state]);

  React.useEffect(() => {
    engine?.setState(state);
  }, [engine, state]);

  return null;
}
