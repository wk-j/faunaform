# Deploy Faunaform on GitHub Pages from the root of `main`

Faunaform is a no-build static site (`index.html` + `styles.css` + ES modules under `js/`), so we publish it on GitHub Pages at the project-page URL `https://wk-j.github.io/faunaform/`, serving files directly from the root of the `main` branch with a `.nojekyll` marker to skip Jekyll processing. This gives a free, instant, HTTPS URL — required for the microphone (`getUserMedia` only runs in a secure context) — with zero build pipeline to maintain.

## Considered options

- **Project page vs. custom domain vs. user-page repo.** Project page won: no DNS or domain to own, and we keep the username root free. Custom domain can be layered on later without restructuring.
- **Deploy from root of `main` vs. `gh-pages` branch vs. `/docs` folder vs. GitHub Actions.** Root of `main` won because the site *is* the source — no build, so a separate publish branch or workflow would only add sync work. `/docs` was unavailable (already holds ADRs and glossary). Actions is overkill until a build step exists.
- **`.nojekyll` vs. default Jekyll processing.** `.nojekyll` won: we serve files verbatim and avoid future surprises where Jekyll silently drops assets whose names start with `_`, `.`, `#`, or `~`.

## Consequences

Everything committed to `main` is browsable under `https://wk-j.github.io/faunaform/`, including `docs/adr/` and `docs/glossary.md`. That is acceptable — these are decision logs, not secrets. Anything truly private must stay out of `main` (e.g., via `.gitignore`, as `.krypton/` already is). If a build step is added later, this decision should be revisited and likely superseded by a GitHub Actions workflow.
