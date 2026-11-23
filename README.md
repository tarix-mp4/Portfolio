# Tareq Albarqawi — Portfolio

This repository starts from the completed **V7 Final Hotfix**. `main` holds
the imported V7 source. Start future V8 work on `v8-development`.

The site is static HTML, CSS, and JavaScript. It has no package installation
or build step. The native video files are kept outside Git.

## Project layout

| Path | What it contains |
| --- | --- |
| `index.html` | Page, project and photo data, native playback paths, and scrub preview metadata |
| `app.js`, `styles.css`, `v4.css`, `v5.css` | Site layout, navigation, gallery, native player, and hero 3D artwork |
| `cinematic.js`, `cinematic.css`, `cinematic-audio.js`, `v6.js`, `v6.css` | Cinematic motion, sound, and finale interactions |
| `geralt.js`, `geralt.css` | Geralt's peeks, discovery, and resting companion |
| `video-previews.js`, `video-previews.css`, `native-video.css` | Preview scrubbing and native player styling |
| `assets/` | Posters, sprite sheets, gallery images and their linked originals, fonts, SVGs, and sounds |
| `_headers`, `robots.txt`, `sitemap.xml` | Existing production headers and crawler metadata |
| `docs/video-assets.md` | Required MP4 paths, checksums, and hosting handoff |

## Run locally

```sh
git clone https://github.com/tarix-mp4/Portfolio.git
cd Portfolio
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows, use `py -m http.server 8000 --bind 127.0.0.1`. Open
[http://127.0.0.1:8000/](http://127.0.0.1:8000/). Serve the site over HTTP
so scripts and sound requests resolve normally.

The checkout can preview the layout and scrub through the committed preview
sheets. For full playback, extract your complete V7 Final Hotfix archive
outside the clone, then copy **only the eight MP4s** into the clone's
`assets/videos/` at the [documented paths](docs/video-assets.md). They are
ignored by Git. Use a local server that supports HTTP byte ranges when testing
video seeking. The showreel remains `CYh5Zr_7LJ8` in 9:16, and Playthings
still plays through YouTube.

## Deployment

Leave the current [Netlify site](https://tarix-portfolio.netlify.app/) on its
existing release. This checkout is for development. Do not connect it to
production or upload the checkout as a static deploy. `netlify.toml` skips
Git-triggered builds and blocks Netlify builds pending a separate video
hosting decision. No production settings are changed by this repository.

Before removing the guard, restore or migrate every native video and verify
playback, seeking, and scrubbing in a separate staging environment. See the
[media handoff](docs/video-assets.md).
