# V8 architecture and roadmap

## Direction and engineering choice

Start from **The Director’s Cut** if selected. Its story begins with Tareq's direction, not a tour of UI effects. The film index makes range and credits legible immediately, the photographs are allowed to work as prints, and the closing card is an unmistakable ending. Its baseline has no canvas or continuous animation. Test a single elective “studio study” drawn from Concept A as part of the hero or a specific 3D case study only after it earns its budget. If the unusual virtual production room matters more than fast scanning, choose Concept A and keep the same still-first default. Do not combine the two page designs by default.

| Option | Strength | Cost / decision |
| --- | --- | --- |
| Vanilla ES modules + static HTML | Small, predictable runtime, strong browser compatibility, no hydration. What the two review pages use today. | Favor for the prototypes or a single-page iteration. Avoid manually duplicating data and assembling several pages as the archive grows. |
| Astro static output + strict TypeScript | Real text, metadata and URLs in HTML. Types for nine project records, photos, credits, aspect ratios and asset policy. Build-time layouts for project pages and components without a site-wide runtime. | Recommended production target if V8 needs individual project routes. Spike one route first and compare with static modules under the same workload. A framework change does not fix shader or paint costs. |
| Three.js behind an on-demand loader | Consistent geometry/material abstractions for a signed-off 3D feature. Easier to extend than raw GL. | Keep out of the initial chunk. The Phase 1 study uses the V7 parametric idea with a tiny purpose-built shader; production Three.js only if the selected interaction needs more materials/camera features. Ensure dispose/recovery and no live shader for the ordinary content. |
| CSS transforms, Web Animations API, optional library | Native disclosure, transforms/opacity and small one-shot animations cover most needs. | Add GSAP or an equivalent only for a specifically approved sequence that needs orchestration and clears the budget. Avoid smooth-scroll replacement, site-wide pointer tracking, and mandatory postprocessing. |

Suggested structure after review: `src/content/` for typed film and photo records, `src/pages/` for HTML routes, `src/components/` for still-first page sections, and small progressive enhancement modules for screening, scrubbing, the photo viewer, Geralt and any live hero. Use a CSS token layer for the approved colors and type hierarchy. No background app framework and no runtime data fetch for the main portfolio. Keep filenames, context and provenance for each existing asset. Build static HTML with alt text, proper headings, responsive images, keyboard access, real deep links, title/description, structured project metadata and a production sitemap.

## Performance budgets for production validation

These are targets, not results or guarantees.

- Initial compressed HTML/CSS/JS **≤ 100 KB**, of which JS **≤ 40 KB**; first-view media+fonts **≤ 650 KB** on a phone. No MP4 request before deliberate playback; no Three.js or background video at initial load.
- Idle: zero application animation frames after the scene settles, apart from explicit short feedback. When an optional scene is active, use a single invalidation scheduler, observe size/visibility, stop at hidden/offscreen/modal, cap drawing-buffer pixels and DPR, and use the still if a hardware context is unavailable. Provide ordinary selection controls with keyboard/touch alternatives and respect reduced motion. Avoid inferring GPU quality from hardware specs or a user-agent string.
- Interaction: target ≤ 25 ms p95 while moving the pointer on the agreed 60 Hz desktop lab fixture, excluding page startup; use LoAF attribution to address >50 ms work. Validate field p75 **INP ≤ 200 ms**, **LCP ≤ 2.5 s**, **CLS ≤ 0.1** where sufficient real traffic permits measurement. Separate desktop/mobile, browsers and rendering tiers. Test same assets and playback state before comparing concepts.
- Access: keyboard and native focus order, visible focus, headings and labels, Escape with focus restoration, 320 px layout, readable 200% zoom, no hidden indispensable controls, captions/transcripts where available, sound off until requested. Test real low-/midrange Windows hardware, macOS Safari, Chrome/Firefox, iPhone Safari, and Android Chrome before release.

## Media migration is a separate workstream

Use [the original native video manifest](../video-assets.md) as the source of truth. Start with a byte-for-byte local restore for staging. Then select an appropriate object storage/CDN or streaming host after checking cost, rights, expected traffic and bandwidth. Verify HTTPS, video MIME type, byte ranges and seeking (including Safari), cache/versioning, CORS and CSP where applicable, aspect ratios, posters, documented fallback, and captions. Preserve original master files, keep the eight MP4s outside Git, and test the media switch in private staging before any Netlify release. Keep Playthings on its existing YouTube source unless a real approved native file is supplied.

## Recoverable milestones

| Checkpoint | Deliverable and go/no-go gate |
| --- | --- |
| 1 / Compare | Audit + two reviewable prototypes on a branch from `v8-development`. The V7 baseline stays protected. Stop here for a direction selection. |
| 2 / Prove the direction | Foundation, typed content, the approved hero and one complete project route. Preserve the reel and validate fallback, navigation, links, color and font accessibility. Measure the static version and any opt-in 3D against the budgets; if the trial fails, ship the still and revisit the scene. |
| 3 / Migrate the archive | All projects/credits/links, the complete gallery and biography/experience/CV, plus authentic scrub and a correct native player in staging. Use the separate media workstream; compare inventory and hashes. Save one self-contained review checkpoint before interactions. |
| 4 / Restore signature moments | Finale, original Geralt, opt-in original cues, a restrained transition and carefully measured 3D. Verify native scroll, touch, keyboard, reduced motion and physical Safari. |
| 5 / Validate and release | Real-device traces, input timing, media parity, accessibility, SEO and broken-link checks. Agree rollout/rollback and approval before a production change. No source-only deploy. |

Use separate commits per milestone and GitHub review against `v8-development`. Record verified commit IDs, media manifest revision and test evidence in each checkpoint. Keep production `main` and the current Netlify deployment isolated until explicitly authorized.

References: [Astro islands](https://docs.astro.build/en/concepts/islands/), [Three.js on-demand rendering](https://threejs.org/manual/pages/rendering-on-demand.html), [Three.js responsive drawing buffers](https://threejs.org/manual/pages/responsive.html), [Web Vitals thresholds](https://web.dev/articles/vitals).
