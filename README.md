# PixelShrink

A privacy-first image compressor and resizer built with React, TypeScript and Vite. Image files are processed locally in the browser; there is no upload API or image-storage backend.

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
The included GitHub Actions workflow builds and publishes the site when changes are pushed to `main`. Enable **Settings → Pages → Build and deployment → GitHub Actions** in the repository. The workflow handles the `/PixelShrink/` project-site path and publishes direct entries for each tool page.

To deploy on another host or a custom domain, update the canonical URL in `index.html` and the sitemap URL in `public/robots.txt` and `public/sitemap.xml`. For Cloudflare Pages, use `npm run build` and `dist` as the output directory.

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
- Page titles are selected client-side for the SEO landing routes. For stronger search indexing, prerender each route to static HTML before scaling SEO.
- The Google Fonts stylesheet is optional. Remove the `@import` in `src/styles.css` to avoid third-party font requests and use system fonts only.
