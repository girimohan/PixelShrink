# PixelShrink

A free online image compressor, resizer, and converter built with React, TypeScript, and Vite. PixelShrink processes images 100% client-side in your browser: files are never uploaded to a processing server, and no account is required.

## Live tools
- [PixelShrink image compressor](https://girimohan.github.io/PixelShrink/)
- [Free image resizer](https://girimohan.github.io/PixelShrink/image-resizer/)
- [JPG to WebP converter](https://girimohan.github.io/PixelShrink/jpg-to-webp/)
- [Compress image to 200 KB](https://girimohan.github.io/PixelShrink/compress-image-to-200kb/)

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Run locally
```bash
npm ci
npm run dev
```
Open the local URL printed by Vite.

## Production build
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
The included GitHub Actions workflow builds and publishes the site when changes are pushed to `main`. Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository. The build prerenders each tool page with its own title, description and canonical URL, while the workflow handles the `/PixelShrink/` project-site path and SPA fallback.

For another host or a custom domain, set `SITE_URL` to the canonical site origin/path during `npm run build`. For Cloudflare Pages, use `npm run build` and `dist` as the output directory.

## Features
- JPG, PNG and WebP input
- JPG, PNG and WebP output
- Quality control for lossy formats
- Target size search for JPG/WebP
- One-click target-size presets
- Maximum width and height resizing
- Multiple images, up to 20 per batch
- Local processing; files are not uploaded

## Notes and limitations
- The browser's canvas encoder determines output size and quality. Exact byte targets are not guaranteed; the app reports when a target cannot be reached at the selected dimensions.
- WebP is the default for website use; JPG is available for broader app and upload compatibility. PNG quality cannot be adjusted.
- PNG export uses browser canvas PNG encoding; the quality slider does not apply.
- Canvas re-encoding can remove EXIF metadata, GPS metadata, embedded color profiles and other ancillary data. Do not use this tool where preserving original metadata is required.
- Animated GIFs, SVG, HEIC/HEIF and RAW formats are not supported.
- Images are limited to 25 MB each and 20 files per batch.
- Landing pages are prerendered as static HTML so their content and metadata are available without client-side rendering.
- The Google Fonts stylesheet is optional. Remove the `@import` in `src/styles.css` to avoid third-party font requests and use system fonts only.
