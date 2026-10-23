# Cohen Bryant — Mechanical Engineering Portfolio

A high-performance static portfolio site for an incoming mechanical engineering undergraduate at UW–Madison focused on propulsion systems, rocket engines, thermal architectures, and engineering data analysis.

**No build step. No dependencies. No framework.** Built with semantic HTML5, modern CSS3 (cascade layers, design tokens), and vanilla ES2020 JavaScript. It deploys directly to Vercel and runs on any standard static file server.

Live at <https://portfolio-six-ecru-11.vercel.app>.

---

## Running it locally

Any static file server works. With Python:

```bash
python3 -m http.server 8000
```

Then open <http://127.0.0.1:8000>.

---

## Layout

```
index.html                    Homepage: hero, featured WISP work, projects, technical interests, methodology, capabilities, profile, contact
projects/
  wisp-torch-ignitor.html     Dedicated WISP Torch Ignitor Case Study & Embedded PDF Presentation
  wisp-torch-ignitor/         Directory index alias for clean URLs
styles.css                    All styles, organized with CSS cascade layers and design tokens
script.js                     Vanilla ES2020: starfield canvas, subnav scrollspy, document viewer toggle, counters, dialogs
404.html                      Custom not-found page
site.webmanifest              PWA / installability metadata
robots.txt                    Crawler directives + sitemap pointer
sitemap.xml                   Multi-page XML sitemap
vercel.json                   Security headers (CSP frame-src, object-src) and cache policies for Vercel
assets/
  favicon.svg                 Scalable vector icon
  apple-touch-icon.png        180x180 icon
  icon-192.png, icon-512.png  PWA icons
  og-cover.png                1200x630 social preview card
  cohen-headshot.jpg          Profile photo at UW–Madison Engineering
  Cohen_Bryant_Draft.pdf      Current Résumé PDF
  wisp-page-1.png, wisp-page-2.png  High-res renders of original data presentation
  documents/
    wisp-torch-ignitor-analysis.pdf Complete 2-page source PDF presentation
  figures/                    Extracted high-resolution engineering plots & tables
    wisp-p1-g1-throat-temp.png
    wisp-p1-g2-radial-profile.png
    wisp-p1-g3-firing-duration.png
    wisp-p1-g4-orifice-sizing.png
    wisp-p2-g1-mach-geometry.png
    wisp-p2-g2-pressure-temp.png
    wisp-p2-g3-velocity-heatflux.png
    wisp-p2-g4-species-massfrac.png
```

---

## If the domain changes

The absolute site URL is baked into the canonical tag, the social preview tags,
and the sitemap, because link previews and search indexing require it. Should the
domain ever change, find and replace the old URL in exactly three files:

| File | Occurrences |
| --- | --- |
| `index.html` | canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD `@id` and `url` |
| `robots.txt` | sitemap line |
| `sitemap.xml` | `<loc>` |

`index.html` has a commented banner marking that block. Also update `<lastmod>`
in `sitemap.xml` when content changes meaningfully.

---

## Editing content

Everything is literal HTML - there is no CMS or data file to reconcile, which
means search engines and screen readers see exactly what you edit.

**Add a project.** Copy an existing `<article class="card">` inside
`.work-grid`. Two attributes matter:

- `data-tags` - space-separated filter keys. Each must match the `data-filter`
  value on a button in `.filter-row`, otherwise the card is unreachable by
  filtering.
- `data-open` on the "Case notes" button - must equal the `id` of its `<dialog>`.

Then add a matching `<dialog class="case">` alongside the other dialogs. To add a
filter category, add a `<button class="chip-btn" data-filter="yourkey">` and use
`yourkey` in `data-tags`.

**Update the hero counters.** Each is `<span data-count="5" data-pad="2">05</span>`.
`data-count` is the target, `data-pad` zero-pads the display, and the text inside
the span is the no-JavaScript fallback - keep all three consistent.

**Design tokens.** Colors, type scale, and spacing live in one `:root` block at
the top of `styles.css`. Change `--blue`, `--band-y`, or `--fs-hero` there rather
than hunting through individual rules.

---

## Design notes

The palette follows SpaceX's restraint: a pure black field, white as the primary
accent (which is why the main call-to-action is a white button with black text
rather than a colored one), steel grey for secondary text, and blue used
sparingly for emphasis. The signature `#005288` is too dark to carry text on
black at an accessible contrast ratio, so it appears only in glows and gradients;
`--blue-lift` (`#5aa9ff`) carries anything that has to be read.

Display type is **Barlow Condensed**, the closest widely available match to the
DIN-derived condensed lettering used across aerospace. Body copy is **Inter**,
and **IBM Plex Mono** handles labels and data readouts.

The hero horizon is not an image. It is one very large CSS circle whose top edge
is lit by an offset box-shadow, producing an atmospheric limb like the view from
orbit - resolution-independent, nothing to download, no layout shift. The stars
are a canvas that renders at device pixel ratio and suspends itself whenever it
scrolls out of view or the tab is hidden.

---

## Accessibility and resilience

- Every text color meets WCAG AA (4.5:1) against its background.
- Case notes use the native `<dialog>` element, so the focus trap, `Esc` to
  close, and focus restoration are the browser's responsibility rather than
  hand-rolled.
- Scroll reveal is gated behind a `.js` class, so with JavaScript disabled the
  full page renders immediately instead of staying invisible.
- `prefers-reduced-motion` disables the starfield and all transitions;
  `forced-colors` hands the palette over to the operating system.
- Each JavaScript module initializes inside its own error boundary, so one
  failure cannot cascade into the others.
- Printing collapses the page into a clean document: decoration removed, colors
  flattened, link targets spelled out.

---

## Regenerating raster assets

The PNG icons and the social card are generated rather than hand-drawn, so they
can be rebuilt after a brand change. Requires Windows PowerShell, since it uses
`System.Drawing`:

```powershell
powershell -ExecutionPolicy Bypass -File tools/generate-assets.ps1
```

The script prefers **Bahnschrift SemiBold Condensed** (Windows' DIN derivative)
for display text and falls back through Segoe UI to Arial.

---

## Deployment

Vercel serves the repository root as-is; no build command or output directory is
needed. `vercel.json` adds a content security policy, HSTS, `nosniff`, a referrer
policy, and immutable one-year caching for `/assets`.

The CSP allows `'unsafe-inline'` for scripts to cover the one-line inline script
that sets the `.js` class before first paint (which avoids a flash of hidden
content) and the JSON-LD block. The page takes no user input, reads no query
parameters, and renders nothing dynamically, so there is no injection surface for
that allowance to widen.

On any other static host, upload the repository root and point 404 responses at
`404.html`.
