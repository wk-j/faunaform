# Glossary

Terms that come up while sharpening the Faunaform deployment plan. Plain definitions, no jargon.

| Term | Meaning |
| --- | --- |
| GitHub Pages | A static-site host built into GitHub. It serves a repo's files over HTTPS at a `*.github.io` URL (or a custom domain) with no server code. |
| Deployment source | The place GitHub Pages reads files from when publishing: a branch + folder, or a CI workflow. Picks "where the live site's files come from." |
| Project page | A Pages site served at `https://<user>.github.io/<repo>/` — one repo, one subsite. Distinct from a "user page" (`<user>.github.io`), which needs a repo named exactly `<user>.github.io`. |
| Secure context | A page served over HTTPS (or `localhost`). Browser APIs like `getUserMedia` (microphone) only work in a secure context — so HTTPS isn't optional for Faunaform. |
| Permissions-Policy | An HTTP header that lets a site allow or block features (mic, camera, geolocation) — including when the page is embedded in an iframe. GitHub Pages does not let you set custom headers. |
