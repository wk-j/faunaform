// Keyboard control scheme, sliders, and the help overlay.
import { state } from "./state.js";
import {
  app,
  controlsToggle,
  sensitivity,
  smoothing,
  sensitivityValue,
  smoothingValue,
  keyFreeze,
  freezeState,
  helpOverlay
} from "./dom.js";
import { startMic, stopMic } from "./audio.js";
import { startCapture, clearSignatures } from "./signatures.js";
import { setMode } from "./modes.js";
import { rotateCamera } from "./camera.js";

export function updateControlText() {
  sensitivityValue.value = `${Number(sensitivity.value).toFixed(2)}x`;
  smoothingValue.value = Number(smoothing.value).toFixed(2);
  if (state.analyser) {
    state.analyser.smoothingTimeConstant = Number(smoothing.value);
  }
}

function toggleMic() {
  if (!state.micSupported) return;
  if (state.isLive) stopMic();
  else startMic();
}

function toggleFreeze() {
  state.isFrozen = !state.isFrozen;
  keyFreeze.classList.toggle("on", state.isFrozen);
  freezeState.textContent = state.isFrozen ? "frozen" : "freeze";
}

function toggleHelp(force) {
  state.helpOpen = typeof force === "boolean" ? force : !state.helpOpen;
  helpOverlay.hidden = !state.helpOpen;
}

// Show or hide the top control bar; graphs fill the screen when it is hidden.
function toggleControls(force) {
  state.controlsVisible = typeof force === "boolean" ? force : !state.controlsVisible;
  app.classList.toggle("controls-hidden", !state.controlsVisible);
  controlsToggle.classList.toggle("on", state.controlsVisible);
  controlsToggle.setAttribute("aria-pressed", String(state.controlsVisible));
}

function adjustRange(input, delta) {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  input.value = Math.min(max, Math.max(min, parseFloat(input.value) + delta));
  updateControlText();
}

// Match OrbitControls mouse-drag angular speed: 2π × (pixel delta / height).
function cameraRotateStep(shiftScale) {
  const canvas = document.getElementById("workspaceCanvas");
  const height = Math.max(1, canvas?.clientHeight || 600);
  const pixels = 28 * shiftScale;
  return (2 * Math.PI * pixels) / height;
}

export function initControls() {
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

    if (event.key === "?") { toggleHelp(); event.preventDefault(); return; }
    if (event.key === "Escape") {
      if (state.helpOpen) { toggleHelp(false); event.preventDefault(); }
      return;
    }

    const big = event.shiftKey ? 5 : 1;
    switch (event.code) {
      case "KeyM": toggleMic(); break;
      case "KeyC": startCapture(); break;
      case "KeyX": clearSignatures(); break;
      case "KeyH": toggleHelp(); break;
      case "KeyT": toggleControls(); break;
      case "Space": toggleFreeze(); break;
      case "Digit1": case "Numpad1": setMode(1); break;
      case "Digit2": case "Numpad2": setMode(2); break;
      case "Digit3": case "Numpad3": setMode(3); break;
      case "Digit4": case "Numpad4": setMode(4); break;
      case "ArrowLeft": rotateCamera(cameraRotateStep(big), 0); break;
      case "ArrowRight": rotateCamera(-cameraRotateStep(big), 0); break;
      case "ArrowUp": rotateCamera(0, cameraRotateStep(big)); break;
      case "ArrowDown": rotateCamera(0, -cameraRotateStep(big)); break;
      case "BracketLeft": adjustRange(sensitivity, -big * 0.05); break;
      case "BracketRight": adjustRange(sensitivity, big * 0.05); break;
      case "Comma": adjustRange(smoothing, -big * 0.01); break;
      case "Period": adjustRange(smoothing, big * 0.01); break;
      default: return;
    }
    event.preventDefault();
  });

  sensitivity.addEventListener("input", updateControlText);
  smoothing.addEventListener("input", updateControlText);
  controlsToggle.addEventListener("click", () => toggleControls());
}
