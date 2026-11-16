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
const homepageFaqs = [
  {
    question: 'Are my images uploaded to a server?',
    answer: 'No. Image decoding, resizing and compression happen in your browser. The website does not send image files to a processing server.',
  },
  {
    question: 'Which image formats are supported?',
    answer: 'PixelShrink accepts JPG, PNG and WebP images. You can export as JPG, PNG or WebP, subject to browser support.',
  },
  {
    question: 'Can every image be compressed to 200 KB?',
    answer: 'Not always. Very large or detailed images may need to be resized to reach a strict target. PixelShrink reports when the requested target could not be achieved.',
  },
  {
    question: 'Will image quality change?',
    answer: 'Lossy JPG and WebP compression can reduce image quality. PNG output is lossless from the canvas representation, but re-encoding may remove metadata and may not preserve every original file property.',
  },
]
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
    const graph = [{
      '@type': 'WebApplication',
      '@id': `${canonicalUrl}#webapp`,
      name: 'PixelShrink',
      url: canonicalUrl,
      description: page.description,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    }]
    if (route === '/') {
      graph.push({
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: homepageFaqs.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      })
    }
    const structuredData = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
    const markup = renderToString(createElement(App, { initialPath: appPath }))
    const html = template
      .replaceAll('__PAGE_TITLE__', escapeHtml(page.title))
      .replaceAll('__PAGE_DESCRIPTION__', escapeHtml(page.description))
      .replaceAll('__CANONICAL_URL__', escapeHtml(canonicalUrl))
      .replace('__STRUCTURED_DATA__', structuredData)
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)

    if (html.includes('__PAGE_') || html.includes('__CANONICAL_URL__') || html.includes('__STRUCTURED_DATA__') || !html.includes('<div id="root">')) {
      throw new Error(`Failed to generate static HTML for ${route}.`)
    }

    const outputPath = route === '/'
      ? path.join(outputDirectory, 'index.html')
      : path.join(outputDirectory, route.slice(1), 'index.html')
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, html)
    const priority = route === '/' ? '1.0' : '0.8'
    sitemapUrls.push([
      '  <url>',
      `    <loc>${escapeHtml(canonicalUrl)}</loc>`,
      '    <lastmod>2026-11-16</lastmod>',
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n'))
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
