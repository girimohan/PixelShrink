import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

const outputDirectory = path.resolve('dist')
const rawBasePath = process.env.VITE_BASE_PATH || '/'
const baseSegments = rawBasePath.split('/').filter(Boolean)
const basePath = baseSegments.length ? `/${baseSegments.join('/')}/` : '/'
const siteUrl = (process.env.SITE_URL || 'https://girimohan.github.io/PixelShrink').replace(/\/+$/, '')
const vite = await createServer({ appType: 'custom', logLevel: 'error', server: { middlewareMode: true } })

try {
  const { default: App, routes } = await vite.ssrLoadModule('/src/App.tsx')
  const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')
  const entries = Object.entries(routes)
  const sitemapUrls = []

  for (const [route, page] of entries) {
    const routePath = route === '/' ? '' : `${route.slice(1)}/`
    const appPath = `${basePath}${routePath}`.replace(/\/+/g, '/')
    const canonicalUrl = `${siteUrl}${route === '/' ? '/' : `${route}/`}`
    const markup = renderToString(createElement(App, { initialPath: appPath }))
    const html = template
      .replaceAll('__PAGE_TITLE__', escapeHtml(page.title))
      .replaceAll('__PAGE_DESCRIPTION__', escapeHtml(page.description))
      .replaceAll('__CANONICAL_URL__', escapeHtml(canonicalUrl))
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)

    if (html.includes('__PAGE_') || html.includes('__CANONICAL_URL__') || !html.includes('<div id="root">')) {
      throw new Error(`Failed to generate static HTML for ${route}.`)
    }

    const outputPath = route === '/'
      ? path.join(outputDirectory, 'index.html')
      : path.join(outputDirectory, route.slice(1), 'index.html')
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, html)
    sitemapUrls.push(`  <url><loc>${escapeHtml(canonicalUrl)}</loc></url>`)
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls,
    '</urlset>',
    '',
  ].join('\n')
  await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap)

  const robotsPath = path.join(outputDirectory, 'robots.txt')
  const robots = await readFile(robotsPath, 'utf8')
  await writeFile(robotsPath, robots.replace(/^Sitemap:.*$/m, `Sitemap: ${siteUrl}/sitemap.xml`))
} finally {
  await vite.close()
}
