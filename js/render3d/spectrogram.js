// Live spectrogram form: a scrolling heat-map panel. Frequency runs up the Y
// axis, time scrolls right-to-left across X, and loudness drives color. Unlike
// the bar forms (a single instant), this form keeps a short history of the
// signal, so a sound's *shape over time* is visible — a chirp sweeps, a trill
// pulses, a hiss fills the panel. Implemented as a DataTexture written one
// column per frame and scrolled via a ring-buffer offset, so the per-frame cost
// is one column write plus a texture re-upload, not a full-array memmove.
//
// The 3D workspace has a LIGHT background, so this reads as a light panel (a
// near-white card). Color encodes LOUDNESS directly (not frequency): quiet air
// stays near the panel color and blends with the workspace, and energy climbs a
// high-contrast ramp teal → green → amber → red → deep violet. Loudness maps to
// both hue AND darkness, so where a sound is strong is unmistakable on the card
// — frequency is already the vertical axis, so hue is free to carry magnitude.
import * as THREE from "three";

// The panel's quiet color (near-white card) and its soft frame, both light to
// sit naturally on the light workspace.
const PANEL = { r: 238, g: 242, b: 247 };
const FRAME_HEX = 0xccd4de;

// Loudness colormap. Stops are byte RGB; each successive stop is more saturated
// and darker than the last, so perceived intensity rises monotonically with
// energy — the property a frequency-position rainbow lacked.
const HEAT = [
  { t: 0.0, c: [238, 242, 247] }, // panel — silence blends away
  { t: 0.06, c: [40, 175, 190] }, // teal — even faint energy inks in clearly
  { t: 0.26, c: [40, 160, 85] }, // green
  { t: 0.5, c: [235, 160, 35] }, // amber
  { t: 0.74, c: [215, 45, 70] }, // red
  { t: 1.0, c: [60, 20, 90] } // deep violet — loudest
];

// Map a loudness byte (0-255) to an [r,g,b] byte triple via the colormap. sqrt
// pre-warps the input so quiet-to-mid energy spreads across more of the ramp
// and reads clearly instead of hugging the pale low end.
function heat(mag, out) {
  const t = Math.sqrt(mag / 255);
  let lo = HEAT[0];
  let hi = HEAT[HEAT.length - 1];
  for (let i = 1; i < HEAT.length; i++) {
    if (t <= HEAT[i].t) {
      lo = HEAT[i - 1];
      hi = HEAT[i];
      break;
    }
  }
  const span = hi.t - lo.t;
  const k = span > 0 ? (t - lo.t) / span : 0;
  out[0] = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * k);
  out[1] = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * k);
  out[2] = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * k);
}

export function createSpectrogramForm({
  timeCols = 512,
  freqRows = 512,
  width = 11,
  height = 4.2,
  midY = 1.35,
  binFraction = 0.7
} = {}) {
  // A group so the scrolling texture panel and its frame move and toggle
  // together; render3d.js flips `.visible` on this group.
  const group = new THREE.Group();
  group.position.y = midY;

  const data = new Uint8Array(timeCols * freqRows * 4);
  // Seed every pixel to the light panel color (opaque) so an idle panel reads as
  // a clean card, not a transparent gap.
  for (let i = 0; i < data.length; i += 4) {
    data[i] = PANEL.r;
    data[i + 1] = PANEL.g;
    data[i + 2] = PANEL.b;
    data[i + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, timeCols, freqRows, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; // lets the ring-buffer offset scroll seamlessly
  // NearestFilter at this high density (512×512) gives crisp, hard-edged cells
  // with no softening — at ~1-2 screen pixels per texel it reads sharp, not
  // blocky. (LinearFilter smoothed the panel, which read as "blurry".) No
  // mipmaps, since the panel is only ever magnified.
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  // Soft frame: slightly larger and just behind the panel, a light gray so the
  // card has a defined edge against the workspace without going dark.
  const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.28, height + 0.28),
    new THREE.MeshBasicMaterial({ color: FRAME_HEX, fog: false })
  );
  backing.position.z = -0.02;
  group.add(backing);

  // fog:false keeps the heat colors crisp — scene fog would blend them toward
  // the light background and flatten the contrast we just built.
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, fog: false })
  );
  group.add(panel);

  const rgb = [0, 0, 0];
  let head = 0; // next column to overwrite (oldest visible column)

  function update(frequencyData, gain = 1) {
    const usableBins = Math.max(1, Math.floor(frequencyData.length * binFraction));
    for (let r = 0; r < freqRows; r++) {
      // Row 0 is texture-bottom: keep low frequencies at the bottom of the panel.
      const bin = Math.min(usableBins - 1, Math.floor((r / freqRows) * usableBins));
      // Apply the sensitivity gain (same control the bars use) so the panel is
      // as bold as the other forms and the user can push it with [ / ].
      const mag = Math.min(255, (frequencyData[bin] || 0) * gain);
      heat(mag, rgb);
      const idx = (r * timeCols + head) * 4;
      data[idx] = rgb[0];
      data[idx + 1] = rgb[1];
      data[idx + 2] = rgb[2];
    }
    head = (head + 1) % timeCols;
    // Oldest column (head) sits at the left edge, newest (head-1) at the right.
    texture.offset.x = head / timeCols;
    texture.needsUpdate = true;
  }

  function dispose() {
    backing.geometry.dispose();
    backing.material.dispose();
    panel.geometry.dispose();
    panel.material.dispose();
    texture.dispose();
  }

  return { mesh: group, update, dispose };
}
