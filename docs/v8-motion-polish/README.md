# Concept C · Motion polish

This pass extends the verified [Concept C review](../v8-phase-1b/README.md) at `b74f5b4`. It is an interactive review prototype. The eight project records, nine photographs, colors, type, contact links, authentic frame sheets, and both native review videos are carried over byte for byte. The excluded full-size masters were not added.

[Open the revised private preview](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/v8/motion-polish/index.html) · [Original Concept C](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/v8/phase-1b/index.html) · [Concepts A and B](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site/)

From the repository root, run `python3 -m http.server 8000` and open `http://localhost:8000/v8/phase-1b/`. Use **Play studio tour** for the coordinated motion. The separate review attachments include desktop and mobile screenshots and a seven-second before/after clip. The clip uses real Chromium frames sampled at marked times and slowed for comparison.

| Area | Change |
| --- | --- |
| Stage | Staggered type and rig entrance, coordinated prop depth, a camera cue, and interpolated lighting on the actual original mesh. The orbit control works even when optional motion is paused; horizontal drag also has a touch gesture threshold. |
| Cut room | Monitor sweep and selection cues, frame and timecode feedback, native range drag, arrow navigation, and an animated viewer that starts playback immediately. Pointer and range changes share one queued paint. |
| Stills | Decode before swapping, crossfade originals over the previous exposure, reveal the frame, and blend the room light to the selected image. Arrow keys move through the contact sheet. |
| Finale | Hinge, readout, spindle, and lighting react as one cue. Rapid clicks are guarded; the production rule remains `Math.random() < .25` for a new scene. |
| Contact | Layered Instagram grade, luminous WhatsApp green, warm envelope and cool phone signal. Hover, keyboard focus, and touch press use the same contrast-safe foreground. Instagram crossfades for 640 ms and drifts for 725 ms. |
| Geralt | The original cat peeks behind the actual print with a hit area above its rim. Discovery lifts and carries him to the center; dismissal lets the cat travel independently between the box artwork and the pixel-matched foreground flap. The dock is a direct child of `body`, uses safe-area insets, and never updates its coordinates from chapter scrolling. |

## Verification

- Rendered in Chromium at the 1363 px desktop viewport and in responsive frames at 320, 375, 390, 430, 768, and 1280 px. All six frames had matching normal layout and scroll widths.
- Stepped through the real Instagram compositor transition in both directions. Opacity at 0/160/320/480/640 ms was 0/.308/.786/.959/1 going in and 1/.692/.214/.041/0 going out. An unpaused pointer exit also recorded intermediate values. Keyboard focus reached Instagram and WhatsApp.
- The software mesh responded to the orbit control, gel selection and stage-camera cue. At 390 px, idle canvas draws stayed **6 → 6** and frame wakes **10 → 10**. Offscreen they stayed **9 → 9** and **22 → 22** across subsequent work interactions.
- Native 432×768 showreel played on desktop/390 px, and the 640×360 A Quiet Trail excerpt played on desktop. Mouse movement changed source frames; a 390 px timeline drag reached frame 25. Keyboard End reached frame 32 and timecode 06:48.25. Elham used its existing sheet; Playthings kept its existing YouTube path.
- Photo selection changed to the original blue-hour exposure and its indigo lighting. Viewer arrows and Escape worked. Geralt was activated with a pointer and keyboard; the celebration, flight, front/back layer order and fixed position were observed, including scrolling between Work, Stills and Wrap. The mobile dock kept a 4 px bottom offset in the normal browser viewport and cleared the footer link.
- The slate accepted a single advance from a double click. The studio tour completed through the contact-card cues. With the motion toggle on, transitions became instantaneous and scrubbing still worked. No application console errors were captured in the test run.

The [browser observations](browser-results.json) were collected with Chromium and the live software mesh fallback. Narrow viewports used mouse/keyboard input; physical touch, real iPhone Safari toolbar behavior, and a hardware WebGL GPU trace were unavailable. On an iPhone, check a horizontal stage or timeline gesture, unlock the dock, and scroll through Work while Safari’s bottom bar expands and collapses.

## Art provenance

The two user-supplied box variants are stored as [transparent SVG](../../v8/phase-1b/media/geralt/cardboard-box.svg) and [transparent PNG](../../v8/phase-1b/media/geralt/cardboard-box.png). The SVG preserves the 64×64 pixel runs and colored pixels; only the connected matte and its faint neutral edge remnants were removed. The PNG already had an alpha channel; only alpha values 1–7 and their faint stray pixels were cleared. All visible input RGBA values and the original 1254×1254 dimensions were preserved. Both have completely transparent boundaries. The [front flap layer](../../v8/phase-1b/media/geralt/cardboard-box-front.svg) copies the exact aligned pixels of the original vector, so the foreground box can occlude Geralt without clipping his artwork to a flat line. No box was regenerated.
