# Migrate Faunaform UI to a 3D workspace using Three.js

We are replacing the 2D four-panel layout with a single 3D workspace rendered with Three.js, loaded via an ES module `<script type="importmap">` from unpkg (no build step). The workspace uses a mode switcher (one canvas, switch forms with number keys) and ships forms incrementally — spectrum as 3D light columns first, with waveform / radial / signatures hidden behind "in development" until each is rebuilt natively in 3D. This preserves the no-build deploy story from ADR 0001 while introducing a runtime dependency on a CDN-hosted library.

## Considered options

- **Library** — Three.js vs Babylon.js vs p5.js (WEBGL) vs raw WebGL. Three.js won: de-facto standard, best docs, right balance of control and batteries for "scientific creative" graph forms. Babylon is overkill (game-engine scope), p5.js WEBGL is too constrained for precise work, raw WebGL is too slow to hand-write.
- **Delivery** — CDN importmap vs vendored copy vs npm + bundler build step. CDN importmap won: preserves ADR 0001 (no build, deploy from root of `main`); vendored bloats the repo by ~150 KB gz and needs manual updates; npm build step would force a new GitHub Actions workflow and supersede ADR 0001.
- **Workspace structure** — Unified single scene (all forms coexisting) vs panel grid of 3D canvases vs mode switcher (one form at a time). Mode switcher won: keeps one render loop and one camera, lets each form own the full viewport, and Signatures mode still shows multiple captures overlaid for shape comparison (the comparison isn't lost — it lives inside that mode).
- **Camera control** — OrbitControls (mouse only) vs cinematic auto-camera vs keyboard-only vs hybrid. Hybrid won: keeps the existing "keyboard-driven" promise (arrows and friends) for camera, while allowing mouse/touch via OrbitControls for new users and mobile.
- **Visual aesthetic** — Light + field vs sculptural solids vs particle clouds vs topographic terrain. Light + field won: matches "scientific creative" in `CONTEXT.md` (precise + performative + light), and reflects the wave/oscillation nature of sound better than solid objects or static terrain.
- **Migration order** — Incremental (spectrum first) vs big-bang (all four at once) vs branch-parallel. Incremental won: validates the CDN + importmap + Pages + microphone pipeline on day one, gets real user feedback fast, and lets us learn Three.js patterns on the most familiar form (spectrum bars) before tackling harder ones.
- **Spectrum 3D representation** — Light columns vs aurora curtain vs sound tunnel vs light terrain. Light columns won: closest to the existing 2D bars (low learning curve), best for testing whether 3D graph forms are *readable* at all, and teaches the Three.js patterns (`InstancedMesh`, bloom post-processing, OrbitControls) needed for later forms.
- **Layout during transition** — Hide modes 2-4 vs split 2D/3D UX vs unified shell with 2D-on-3D. Hide won: cleanest UX (one complete 3D form beats four half-finished ones), no parity burden between 2D and 3D renderers, and Signatures state can still be captured via `C` / `X` for when Signatures mode ships.

## Consequences

- **New runtime dependency on unpkg.** Acceptable: high-uptime CDN, cacheable across sites, easy to swap for a vendored copy later. Falls back gracefully (if unpkg fails, the canvas is dark and the rest of the UI still loads).
- **`js/render.js` and the 2D canvas elements become dead code** during the transition. Kept as reference for porting visual details (colors, thresholds, label formats); will be deleted once all four forms ship in 3D.
- **Arrow-key reallocation needed.** Arrows currently drive sensitivity/smoothing; in 3D they become camera controls. Sensitivity/smoothing will move to other keys (or a HUD slider) — to be resolved during implementation of the spectrum form.
- **Does not supersede ADR 0001.** The deploy story is unchanged (still deploy from root of `main`, still no build step). If a build step is added later (e.g., to tree-shake Three.js or bundle signatures), that decision should be recorded as a new ADR that *does* supersede this one and ADR 0001.
