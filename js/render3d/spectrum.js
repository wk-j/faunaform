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
  const material = new THREE.MeshStandardMaterial({
    // White base so instanceColor (set via setColorAt) is the visible tint.
    // vertexColors is omitted: USE_INSTANCING_COLOR has its own shader path in
    // r160 (vColor starts at 1.0, then *= instanceColor). Enabling vertexColors
    // without a geometry color attribute zeros diffuse via the vertex color attr.
    color: 0xffffff,
    metalness: 0.06,
    roughness: 0.58,
    emissive: 0x000000,
    emissiveIntensity: 0
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
