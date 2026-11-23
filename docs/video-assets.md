# V7 native video inventory

The V7 Final Hotfix uses the following local H.264/AAC MP4s. Paths are relative to the repository root and are case sensitive. Restore the original files at these paths for local playback.

| Project | Existing path | Dimensions (aspect ratio) | Bytes |
| --- | --- | --- | ---: |
| Showreel 2026 | `assets/videos/showreel.mp4` | 1080 × 1920 (9:16) | 56,158,033 |
| A Quiet Trail | `assets/videos/a-quiet-trail.mp4` | 1280 × 720 (16:9) | 68,286,665 |
| Elham | `assets/videos/elham.mp4` | 1280 × 720 (16:9) | 122,732,164 |
| Vision Types Simulation | `assets/videos/vision-types.mp4` | 720 × 1280 (9:16) | 2,019,217 |
| Acuity Comparison | `assets/videos/vision-types-2.mp4` | 720 × 1280 (9:16) | 2,938,521 |
| VFX & 3D Integration | `assets/videos/integrating-3d.mp4` | 720 × 1280 (9:16) | 9,498,264 |
| Social Campaigns | `assets/videos/social-media-educational.mp4` | 720 × 1280 (9:16) | 21,238,057 |
| Deer Scene | `assets/videos/deer-scene.mp4` | 1920 × 1080 (16:9) | 14,950,278 |

The hero showreel is `CYh5Zr_7LJ8`. Elham uses the native documentary and retains its YouTube fallback. Playthings (`hDDDlkD6jYc`) is YouTube-only; it has no local MP4.

## Verify the restored files

Source: `Tareq_Albarqawi_Portfolio_V7_FINAL_HOTFIX.zip`

Archive SHA-256: `3e7afb589ebf90cb95b4221ed44cfdb9fdcedbffd7b94cc01848564ab3e70ed7`

From the repo root, run the following in Bash (Git Bash on Windows) to check all eight copied files:

```sh
sha256sum -c <<'SHA256'
d1903a8ab0cfb91ccf6ed980cd52d005af64b50b5c1f451c5e2aeccedeffbb18  assets/videos/showreel.mp4
3e677c6cc00573297b78965779d930f94e111b739398bbfdd1e158d368bd3924  assets/videos/a-quiet-trail.mp4
e3b9d230fb4fe833ea06899ec71655fb8dd63458589ef445686c7b1271c586c3  assets/videos/elham.mp4
16b47e7ad86a91dc59c7bb63247c7ad2198ed26447786ea3e8236b7d34c6afbe  assets/videos/vision-types.mp4
77eabd00d9cf0b9bb09bf9f50ad46a69a7e60a74c2daf76cc778d25b5d92f7da  assets/videos/vision-types-2.mp4
0afc7689252730f171adc58073d45172b42181476a50c177529e4a9b86390126  assets/videos/integrating-3d.mp4
74f51bf01d621b712cd857180aaffae3d671ced8646235eaab8fe1445673212d  assets/videos/social-media-educational.mp4
d0b0d675948d7ac520e3f8ba52a43ea5c3e25e6c0e4adf345e7a70e01fd981b9  assets/videos/deer-scene.mp4
SHA256
```

## Future hosting migration

1. Choose storage/CDN delivery for the original MP4s. Keep the existing paths if the host can serve them through the same origin. Otherwise update the native source records, direct video links, applicable preview metadata, and the media policy in `_headers` together.
2. Verify content type, HTTP byte ranges, and caching on staging. Test playback and seeking on desktop and mobile, the 9:16 showreel, Elham, and the existing scrub previews.
3. Confirm the staging release has all eight videos before enabling deploys from GitHub. Keep the current V7 deployment available until the replacement is verified.
