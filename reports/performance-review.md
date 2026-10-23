# Portfolio redesign and performance review

Measured October 22, 2026. Baseline: repository commit `9ccb710`, captured before editing. Implementation remains local; nothing was published.

## Results and measurement limits

The biggest confirmed improvement is elimination of continuous animation work. Loading was already fast locally; differences of a few milliseconds are not evidence of a meaningful loading-speed improvement.

| Measurement | Before | After |
|---|---:|---:|
| Homepage desktop LCP | 80 ms | 72 ms |
| Homepage mobile LCP | 68 ms | 72 ms |
| WISP mobile LCP | 100 ms | 72 ms |
| Observed initial-load layout shift, all three views | 0 | 0 |
| Desktop animation callbacks / first 10 seconds | 1,787 | 0 |
| Mobile animation callbacks / first 10 seconds | 1,794 | 0 |
| Desktop time inside animation callbacks | 115.1 ms | 0 ms |
| Mobile time inside animation callbacks | 45.5 ms | 0 ms |
| JavaScript source bytes | 23,325 | 13,502 |
| CSS source bytes | 72,186 | 76,116 |
| Homepage HTML source bytes | 61,365 | 63,573 |
| Five original JPEGs vs five 480px WebP variants | 1,225,130 bytes | 122,134 bytes |

JavaScript is 42.1% smaller. The 480px photo set is 90.0% smaller; higher-resolution variants are supplied for larger displays. Photo totals are asset-size comparisons, not a claim about initial network transfer. Original assets remain available. CSS grew 4.0 KB to accommodate the new layout, with combined HTML/CSS/JS still smaller.

Conditions: desktop 1440×900; mobile 390×844; same local in-app Chromium browser and loopback server; normal motion setting; no CPU/network throttling; ordinary browser caching, not cleared between runs. Each reported view uses a single 10-second observation. Browser `PerformanceObserver` recorded LCP, layout shifts excluding recent input, and long tasks. A temporary server injected instrumentation before the page scripts and wrapped `requestAnimationFrame` to count callbacks and their elapsed execution time. This instrumentation is absent from shipped HTML/JS. Initial homepage observations had no long tasks before or after. WISP had one 57ms long task before and none after. These are not Lighthouse TBT or INP measurements.

The final chart-layout polish and additional high-resolution srcset options were made after the timing samples; final asset byte counts include them. The local browser did not expose Lighthouse, CPU throttling, network throttling, or device hardware controls. No Lighthouse scores, field INP, sustained 60 FPS, or low-end-device guarantees are claimed. Next verification should run three cold-cache Lighthouse mobile audits per route under identical settings (Slow 4G and 4–6× CPU slowdown), compare medians, and exercise menu, filters and document controls on a physical low-end Android device. Field INP requires representative user interactions and field telemetry. Local resource timing was affected by caching and lazy-image loading, so it is intentionally not used as a transfer-size benchmark.

## Design and optimization

- Charcoal/navy surfaces, readable system typography, restrained warm red accents, and a two-column hero with a static SVG schematic explicitly labeled as illustrative and not to scale.
- Refined featured WISP card, consistent heading hierarchy, quieter cards, improved case-study/document container, and larger touch targets.
- Removed external font stylesheets and three font-family dependencies, canvas starfield, animated counters, scroll reveals, progress scroll handler, continuous decorative CSS animations, backdrop blur and image filter transitions.
- Case-study highlighting uses IntersectionObserver without a per-scroll handler or automatic scrollIntoView calls.
- Native PDF iframe receives its URL only when Interactive PDF is selected. Original page previews, open-in-tab and download links remain. No PDF rendering library was added.
- Responsive WebP photos, lazy below-fold images, and accurate intrinsic dimensions on every image. Scientific charts and original PDFs were not recompressed or edited.

## Verification

Passed JavaScript syntax validation, Python probe syntax validation and `git diff --check`. This is a buildless repository with no package/build/lint/test scripts.

Passed static checks for local links/assets, unique HTML IDs, image alt text/dimensions, byte-identical PDFs, matching case-study route copies, and unchanged text in the existing homepage sections and technical case-study sections. The hero and viewer labels were intentionally rewritten; engineering content and numeric results were retained.

Browser checks: mobile menu opens/closes and Escape restores focus; nuclear filter shows two projects; All restores projects; case-note dialog opens/closes with Escape; featured case-study link navigates; section links reach their targets; PDF mode assigns the original URL only upon selection; page-preview mode renders the original document. No errors/warnings appeared in the checked browser console. Homepage overflow checks passed at 320, 390, 768, 1080 and 1440px after fixing long-button wrapping. Case-study checks passed at 320 and 390px; its section rail intentionally scrolls horizontally.

Native PDF rendering could not be visually confirmed: the in-app browser displayed a blank native PDF surface despite loading the source. Page previews rendered correctly. Open/download targets and the download attribute were checked, but the operating-system download flow was not exercised. Confirm the native viewer and download in Chrome/Safari before release. Reduced-motion styles and no-JavaScript fallbacks were inspected in source, not tested with browser emulation.

## Significant files

- `index.html`: hero schematic/composition, font removal, responsive and lazy images.
- `styles.css`: shared design system, responsive layouts, interaction and rendering refinements.
- `script.js`: removal of continuous/decorative work, safer subnavigation, demand-loaded PDF.
- `projects/wisp-torch-ignitor.html` and `projects/wisp-torch-ignitor/index.html`: synchronized case-study and viewer updates.
- `assets/*-480.webp`, higher-resolution WebP variants: optimized photos.
- `tools/performance-preview.py`: local-only measurement helper.
- `reports/*.png`: before/after desktop/mobile and document screenshots.

## Repeating the local probe

Use an original checkout/export as the baseline directory. Run `python3 tools/performance-preview.py --baseline /absolute/path/to/original --port 8766` from this repository. Visit `/before/` and `/` (and their corresponding WISP routes) at the same viewport. Wait ten seconds without interacting, then read `document.querySelector('#performance-result').textContent` in DevTools. The JSON includes the observation dimensions, paint timing, callback counts and long tasks. This lightweight initial-load CLS observation is not the complete Web Vitals session-window algorithm. The probe is for local use only and binds to loopback; do not deploy it. Stop it with Ctrl+C when done.
