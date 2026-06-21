// Graph-form modes for the 3D workspace. Mode 1 (Spectrum) is the only complete
// form; modes 2-4 render a shared "in development" placeholder until their own
// PRDs ship (see ADR 0002). `currentMode` lives on the shared `state` object so
// it stays the single source of truth; this module owns the mode metadata and a
// tiny subscribe hub so input (controls.js) and output (main.js) stay decoupled.
import { state } from "./state.js";

// `key` matches the active-form key the renderer understands; "spectrum" is the
// only real form, so the other three all resolve to the placeholder.
export const MODES = [
  { id: 1, key: "spectrum", name: "Spectrum" },
  { id: 2, key: "waveform", name: "Waveform" },
  { id: 3, key: "radial", name: "Radial" },
  { id: 4, key: "signatures", name: "Signatures" }
];

const listeners = new Set();

export function getMode() {
  return MODES.find((m) => m.id === state.currentMode) ?? MODES[0];
}

// Subscribe to mode changes; returns an unsubscribe function.
export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setMode(id) {
  const mode = MODES.find((m) => m.id === id);
  if (!mode || mode.id === state.currentMode) return;
  state.currentMode = mode.id;
  for (const fn of listeners) fn(mode);
}
