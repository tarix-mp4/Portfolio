# Phase 1 browser evidence

## What ran

Chromium 156 in the Work cloud browser, Linux, DPR 1. The [raw interaction log](evidence/interaction-results.json) records 31 targeted assertions, including 320, 390, 768, and 1280 px layout widths for each concept and keyboard operation at desktop and 390 px. The viewport previews are responsive layout checks in Chromium, not tests on a physical phone. No overflow was present at the tested widths. A restored original V7 showreel played at 1080 × 1920 in the local native dialog; closing removed its video element. That local V7 test used the original file from the verified archive and is separate from the MP4-free V8 prototypes.

| Checked | Result |
| --- | --- |
| Showreel | Original portrait still and `CYh5Zr_7LJ8` links; English controls, keyboard open and Escape/focus restoration; not a test of external YouTube playback. |
| Work | A selects the correct Elham record and reaches frame 1/33 and frame 33/33; B opens the selected film inline; VFX stays 9:16; old preview released; Playthings has no substitute scrub. |
| Photography | Nine thumbnails in each, back/forward through the real images, keyboard navigation and return focus. |
| Finale and 3D | The clapper demonstrates a new take on click. Gold to wire still switch verified. In this browser the hardware WebGL path was unavailable; original still remained visible and interactive. Hardware-accelerated rotation, driver behavior, physical iPhone/Safari and real touch/zoom were not tested. |

## Measured workloads, not a desktop GPU diagnosis

A local fixture used identical 1280 × 820 CSS viewport width, one scroll path, and a browser Frame/PerformanceObserver probe. It sampled ~1.5 s idle, ~1.7 s scripted pointer movement, and ~2.4 s scripted scroll. The observer log contains frame intervals, long animation frames (LoAF), application callbacks, and encoded bytes observed through the run. No original file was edited for measurement: instrumentation was in a separate served copy.

| Case | Application animation callbacks (idle / pointer / scroll) | WebGL context / draw | p95 frame intervals (idle / pointer / scroll) |
| --- | ---: | --- | --- |
| V7 default | 10 / 6 / 8 | Static fallback / 0 | 599.9 / 600.0 / 600.0 ms |
| V7 motion paused | 0 / 0 / 5 | Static fallback / 0 | 599.9 / 1016.4 / 1016.5 ms |
| A default | 0 / 0 / 0 | Still image / 0 | 1016.5 / 1016.6 / 1016.4 ms |
| B default | 0 / 0 / 0 | No canvas | 16.7 / 16.7 / 1016.4 ms |

Measured counts are for these short samples only. Frame intervals show severe browser pacing artifacts in the cloud (intervals commonly cluster at ~600 or ~1016 ms), including in no-animation cases. **Do not compare these p95s, LCP values, or bytes as speed rankings.** Sparse samples and lazy-image eligibility differ across the scrolled layouts. No LoAF entries were observed in the completed segments; that does not mean there was no input delay. The separate forced-WebGL-off run did not complete in its first attempt. V7 default already used the same fallback. Results support eliminating idle callbacks and avoiding mandatory WebGL. They do not establish GPU cost or the root cause on the affected PCs.

[Raw browser timeline samples](evidence/browser-probes.json) include individual animation-frame intervals and observed counters. The available browser path did not expose a full DevTools GPU/raster trace or a comparable hardware context. No full INP or field Core Web Vitals was claimed. Use the [paired desktop trace protocol](v7-audit.md#baseline-measurement-protocol) on an affected and an unaffected PC as the first technical gate of Phase 2.

## Rendered contact sheets

- [Desktop hero comparison](screens/desktop-comparison.jpg)
- [390 px hero comparison](screens/mobile-comparison.jpg)
- [Selected Work, Photography and Finale](screens/section-comparison.jpg)

The images are screenshots of the actual review pages, arranged side by side. They use the same original assets as the interactive prototypes.
