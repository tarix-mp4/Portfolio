# V8 Phase 1 — creative direction review

Start with [the review entry point](../../v8/phase-1/index.html) or open each concept on a local HTTP server. GitHub renders HTML source as code. From the repository root, no dependencies are needed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# Open http://127.0.0.1:8000/v8/phase-1/index.html
```

[The Digital Studio](../../v8/phase-1/studio.html) · [The Director’s Cut](../../v8/phase-1/cut.html) · [V7 audit](v7-audit.md) · [Architecture and milestones](architecture-roadmap.md) · [Browser evidence](browser-evidence.md)

**[Open the private interactive review](https://tareq-portfolio-v8-phase1-review.fortunepromo-4605.chatgpt.site)** · [Desktop screenshots](screens/desktop-comparison.jpg) · [Mobile screenshots](screens/mobile-comparison.jpg) · [Work, photography and finale](screens/section-comparison.jpg)

## Direction A — The Digital Studio

**Visual idea: a closed soundstage you can operate.** Midnight ink, cyan instrument markings and a warm metal sculpture locate the visitor in a room. The name is the title; the fold reads as a showcase for a specific object rather than a generic 3D background. A movable camera is an explicit control, so the accessible, still-first scene stays equal in design status to the 3D mode.

The archive becomes one calibrated monitor with a project drawer. Instead of multiple moving tiles, the visitor sends one film to one screen; the preview timeline is positioned deliberately below the still. The print room groups nine images by light and color in an even grid. The final clapper is a small active prop, while the screen stays quiet around the contact choices.

The principle borrowed from [Active Theory V6](https://www.cssdesignawards.com/sites/active-theory-v6/45015/) is that a scene can express what a maker does. Here it is Tareq's original gold ribbon, in a custom stage composition, with no fullscreen loader or compulsory WebGL.

## Direction B — The Director’s Cut

**Visual idea: a screening program with a very large front cover.** Warm paper, nearly black ink and one oxide-red accent. The first full-width title card is followed by a real still from *A Quiet Trail*, so authorship leads. The showreel remains a separate portrait screening ticket. A visible index rather than a nest of visual cards makes a working director's range easy to review.

Each film is a disclosure: its credits and timeline open where it is read, with native keyboard controls. The photography changes scale like prints in an exhibition, then ends with a red credit card and the last original frame. It is designed as an editorial reading experience, with no simulated camera or WebGL.

[Criterion’s film index](https://www.criterion.com/shop/browse/list) informed the separation of film, attribution and medium; no interface or artwork was copied. The print sizes and sequence are composed around the V7 body of work.

## Side by side

| | A — Digital Studio | B — Director’s Cut |
| --- | --- | --- |
| First encounter | Enter a soundstage; investigate a familiar gold object | Read a large name; meet the work through *A Quiet Trail* |
| Work | One screening monitor; choose from a thumbnail drawer | Quick scan of eight titles; expand independent film chapters in place |
| Photography | Lit print wall, consistent image bays | Uneven contact sheet with a lead print and tighter pairings |
| Ending | Dim stage, physical clapper gesture, four contact cards | Red end credits, final photograph, clean directory |
| Motion | Optional on-demand 3D; tap/keyboard control; still or wire frame works without it | Native disclosure and short image transitions; no 3D dependency |
| Phone layout | Studio below the name; two-column drawer and print wall; no drag override | Portrait poster scales into the paper layout; the index and lead print become single-column |
| Tradeoff | Stronger visual signature and a richer interaction to validate | Clearer work discovery, simpler loading and lower risk on the affected desktops |

**Recommendation: B as the foundation.** It places the actual filmmaking and stills in the foreground, leaves a path to distinct project pages, and establishes a good baseline for the desktop performance investigation. If the object study in A is a favorite, consider it as one optional 3D case-study plate, measured and tested before taking it to the new site.

## What works in the review

- Both: the correct 9:16 showreel poster and original YouTube link; quick anchors; all eight project records and nine real photographs; keyboard/photo navigation; all four original contact links.
- Real scrubbing: the original seven WebP sprite sheets, matched to the original frame indices and times. Slide or use arrow keys. A single active sheet is retained. The preview is **33 still frames**, not native seeking.
- A: material still switching, gesture-driven live orbit **when the browser grants a suitable WebGL context**, and a labeled clapper demonstration. No audio or timeline state is kept across visits. B: native film disclosures and per-film timelines.
- Native MP4s, sound choreography, Geralt and the full about/experience pages are outside this prototype. The V7 baseline and all archive originals are preserved. An external YouTube reference is available where the V7 record has a video ID; Deer Scene has stills only here. No new creative work or replacement video has been invented.

Please choose A or B before Phase 2. [See milestones and the media plan](architecture-roadmap.md).
