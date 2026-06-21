// Three-free camera keyboard bridge. controls.js imports from here so the
// static module graph (main → controls) never transitively loads "three".
// render3d.js registers the real orbit impl after its dynamic import succeeds.

let cameraRotateImpl = null;

export function rotateCamera(deltaAzimuth, deltaPolar) {
  cameraRotateImpl?.(deltaAzimuth, deltaPolar);
}

export function setCameraRotateImpl(fn) {
  cameraRotateImpl = fn;
}
