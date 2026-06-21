// Live spectrum graph form: instanced light columns along the X axis.
import * as THREE from "three";
import { palette } from "../state.js";

// Match the 2D spectrum gradient stops from render.js.
const COLOR_STOPS = [
  { t: 0, hex: palette.cyan },
  { t: 0.42, hex: palette.lime },
  { t: 0.74, hex: palette.amber },
  { t: 1, hex: palette.rose }
];

function colorAtIndex(index, count) {
  const t = count > 1 ? index / (count - 1) : 0;
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const stop = COLOR_STOPS[i];
    if (t <= stop.t) {
      const prev = COLOR_STOPS[i - 1];
      const local = (t - prev.t) / (stop.t - prev.t);
      return new THREE.Color(prev.hex).lerp(new THREE.Color(stop.hex), local);
    }
  }
  return new THREE.Color(COLOR_STOPS[COLOR_STOPS.length - 1].hex);
}

export function createSpectrumForm({
  barCount = 96,
  span = 11,
  floorY = -0.75,
  maxHeight = 2.8
} = {}) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // Unlit material: instanceColor tints at full saturation so the bars read as
  // vivid glowing columns regardless of scene lights. Bloom supplies the halo.
  // vertexColors stays omitted for the same reason as before: the
  // USE_INSTANCING_COLOR shader path multiplies instanceColor against a base of
  // 1.0 on its own; enabling vertexColors would zero diffuse via the missing
  // color attribute.
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  const mesh = new THREE.InstancedMesh(geometry, material, barCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const gap = span / barCount;
  const columnWidth = gap * 0.72;
  const columnDepth = columnWidth * 1.05;
  const startX = -span / 2 + gap / 2;
  const minHeight = 0.05;

  for (let i = 0; i < barCount; i++) {
    mesh.setColorAt(i, colorAtIndex(i, barCount));
  }
  mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();

  function update(bars) {
    const n = Math.min(barCount, bars.length);
    for (let i = 0; i < n; i++) {
      const height = Math.max(minHeight, bars[i] * maxHeight);
      dummy.position.set(startX + i * gap, floorY + height / 2, 0);
      dummy.scale.set(columnWidth, height, columnDepth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
