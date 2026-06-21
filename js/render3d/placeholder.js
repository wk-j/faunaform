// Shared "in development" placeholder form for modes 2-4 (waveform, radial,
// signatures) until each is rebuilt as a real 3D form. A faint, slowly turning
// double wireframe — on-brand for the "scientific creative" light + field look,
// and enough motion that the workspace never reads as frozen or broken. The
// readable "<Mode> — in development" label is a DOM overlay owned by main.js;
// this module is pure Three.js scene geometry.
import * as THREE from "three";
import { palette } from "../state.js";

export function createPlaceholderForm() {
  const group = new THREE.Group();

  const outer = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.15, 0)),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.cyan),
      transparent: true,
      opacity: 0.5
    })
  );
  group.add(outer);

  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.58, 0)),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.violet),
      transparent: true,
      opacity: 0.45
    })
  );
  group.add(inner);

  // Sit at the camera target height so it reads as centered in the viewport.
  group.position.y = 0.9;

  function update(elapsed) {
    group.rotation.y = elapsed * 0.25;
    outer.rotation.x = elapsed * 0.12;
    inner.rotation.z = -elapsed * 0.2;
  }

  function dispose() {
    for (const child of group.children) {
      child.geometry.dispose();
      child.material.dispose();
    }
  }

  return { group, update, dispose };
}
