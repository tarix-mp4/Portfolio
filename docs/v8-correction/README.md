# Concept C • corrective review

[Latest private review](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/v8/correction/) · [Geralt cue](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/v8/correction/?review=geralt) · [Contact colors](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/v8/correction/?review=contacts) · [Live V7](https://tarix-portfolio.netlify.app/)

The previous Site's root redirected to Phase 1. Its separate Motion Polish route was already current, and its served HTML, scripts, styles and the three box assets matched Sites source `befec09` and the review source at GitHub `a897d04`. A shortcut through the previous review entry therefore led to an earlier design. The latest build is now the default from both the root and the former Motion Polish URL. The previous Motion Polish route is archived; Concepts A, B, and original C retain their own paths.

The current GitHub SHA is in the hero's **Latest review** link and in `/v8/correction/release.json`, alongside the hashes of the released pages and media. The public V7 site and `main` were kept intact.

| Area | V7 and the gap in the earlier V8 | Corrected Concept C |
| --- | --- | --- |
| Stage and navigation | V7 had a visible portrait reel and interactive Blender, After Effects and flash controls. V8 had separate static badges and a more self-contained stage. | Restored the vertical portrait ticket and two working prop motions. The real ribbon eases into place, lights follow the pointer, and the active underline slides between chapters. |
| Film archive | V7 offered real frame previews and native MP4 screening. Earlier C had a strong shared timeline but only two native review copies. | Editor-style cut wipes, frame telemetry and controlled focus. Original public MP4s are loaded on demand, with the unchanged compact showreel and A Quiet Trail excerpt still available. |
| Photography | V7 had an exhibition and contact sheet; C combined the frame with the exposure controls. | Retained all nine images and the layout; added a frame sweep, longer room-light blend, and restored V7's profile, experience and CV access after the gallery. |
| Geralt | V7 let him appear near the name and through the site. Earlier C was easy to miss with one short peek; older versions led to a round dock. | Two safe peek spots, longer dwell, a repeatable real live cue, and a landing that reveals and bounces the original layered box. |
| Finale and contacts | V7 had a deeper prop composition and distinctive brand response. C's older review path and more subtle grading made the change hard to see. | Lens and film strip, synchronized slate and reel cues, and independent fading, drift and bloom for each contact card. The same effects can be played on touch with **Play color pass**. |

| Acceptance item | Status and evidence |
| --- | --- |
| Round base removed | Implemented and visually verified; only the layered cardboard box is visible in the new settled state. |
| Inside the original box | Implemented and visually verified on desktop and 390 px Chromium. The original SVG back, cat and front flap form separate layers. |
| Transparent PNG and SVG | Implemented and verified; checked both original derivatives' alpha boundaries and compared them byte-for-byte with the preserved approved assets. |
| Discovery-to-box transition | Implemented and visually verified. The screen recording contains the actual peek click, celebration, flight, box reveal and settled bounce. |
| Fixed during scrolling | Implemented and visually verified in Chromium through Work, Stills and Wrap. Physical iPhone Safari was unavailable. |
| Instagram entry | Implemented and visually verified with real pointer input. Sampled opacity ≈0.007 → 0.828 → 0.992; layered warm bloom, gradient drift and icon motion. |
| Instagram exit | Implemented and visually verified. Sampled opacity ≈0.627 → 0.055 → dark. |
| WhatsApp transition | Implemented and visually verified; green blooms in and fades out. Email and phone respond to their own warm and cool cues. |
| Navigation and buttons | Implemented and visually verified; sliding current-chapter marker, prop controls, showreel ticket, keyboard contact focus. |
| Project selection and scrubbing | Implemented and visually verified; real Elham and VFX frame index changes, selection wipe, and native Elham and 9:16 Vision Types screening. |
| Photography | Implemented and visually verified; blue-hour exposure changed the room to indigo, and viewer arrows moved to the next image. |
| Hero | Implemented and visually verified; the live mesh, Blender roll, After Effects flip and camera flash responded. |
| Finale | Implemented and visually verified; the slate moved once on a double click, with reel, light and readout coordinated. |
| Responsive layout and scrolling | Implemented and visually verified at 320, 375, 390, 430, 768, 1280 and desktop 1363 px in Chromium. Mobile widths used a mouse/keyboard. |
| V7 content and V8 features | Verified the nine film/reel records, all nine photo records, source scrubbing sheets, contacts, and approved assets against the baseline. The original MP4s returned HTTP 206 at their existing public locations. The review is still a prototype. |

[Browser observations](browser-observations.json) are from the rendered release build. Its private hosted responses were checked separately using authenticated read access. In the software renderer, a short desktop mouse-drag sample took approximately 3.3–6.0 ms from the input handler to drawing submission. This is not end-to-end input latency or a hardware GPU benchmark. Draws stayed 10 → 10 while settled, and 21 → 21 while offscreen. No physical iPhone, iPhone toolbar behavior, or hardware WebGL testing was available.

Run locally from the repository with `python -m http.server 8000`, then open `http://localhost:8000/v8/phase-1b/`. `tools/stage-correction.py` in the same directory assembles the release inside the existing private Site checkout from an exact, clean Git checkout. It is independent of the production deployment.
