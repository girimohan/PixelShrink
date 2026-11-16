import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, FileImage, ImagePlus, LockKeyhole, RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { formatBytes, processImage, safeOutputName, type OutputFormat, type ProcessResult } from './engine'

type Item = { id: string; file: File; preview: string; result?: ProcessResult; error?: string; busy: boolean }

function sizeChangeLabel(originalSize: number, outputSize: number) {
  const change = ((outputSize - originalSize) / originalSize) * 100
  if (change < 0) return `${Math.abs(change).toFixed(1)}% smaller`
  if (change > 0) return `${change.toFixed(1)}% larger`
  return 'Same file size'
}

export const routes = {
  '/': { title: 'PixelShrink – Free Online Image Compressor (JPG, PNG, WebP)', description: 'Compress JPG, PNG, and WebP images in seconds directly in your browser. 100% private—no file uploads, no signup, and no watermarks.', heading: 'Compress images. Keep the quality.', intro: 'Make your images smaller in seconds. No account, no uploads, no complicated settings.' },
  '/image-resizer': { title: 'Free Image Resizer Online – Resize JPG, PNG & WebP | PixelShrink', description: 'Resize JPG, PNG, and WebP images online by setting maximum width and height. Free image resizer with private, in-browser processing.', heading: 'Resize images to the dimensions you need.', intro: 'Set a maximum width and height, then download your resized image.' },
  '/jpg-to-webp': { title: 'JPG to WebP Converter – Free Online Tool | PixelShrink', description: 'Convert JPG images to WebP online for free. Private, in-browser processing keeps your images on your device—no uploads required.', heading: 'Convert JPG images to WebP.', intro: 'Create smaller, modern WebP images without sending files to a server.' },
  '/compress-image-to-200kb': { title: 'Compress Image to 200KB Online – Free Tool | PixelShrink', description: 'Compress an image to 200 KB or less where possible. Free JPG, PNG, and WebP compression with private, in-browser processing.', heading: 'Compress an image to 200 KB.', intro: 'Set a practical file-size target and let PixelShrink find a suitable quality.' },
} as const

function App({ initialPath }: { initialPath?: string } = {}) {
  const pathname = initialPath ?? window.location.pathname
  const path = pathname.slice(import.meta.env.BASE_URL.length - 1).replace(/\/$/, '') || '/'
  const page = routes[path as keyof typeof routes] ?? routes['/']
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [format, setFormat] = useState<OutputFormat>('image/webp')
  const [quality, setQuality] = useState(78)
  const [targetKB, setTargetKB] = useState(path === '/compress-image-to-200kb' ? '200' : '')
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice] = useState('')
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    document.title = page.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', page.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', page.description)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', page.title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', page.description)
    const canonicalPath = `${window.location.pathname.replace(/\/+$/, '')}/`
    const canonicalUrl = new URL(canonicalPath, window.location.origin).href
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
  }, [page])

  useEffect(() => {
    return () => itemsRef.current.forEach(item => URL.revokeObjectURL(item.preview))
  }, [])

  const totalSaved = useMemo(() => items.reduce((sum, item) => sum + (item.result ? Math.max(0, item.file.size - item.result.blob.size) : 0), 0), [items])
  const updateItem = (id: string, patch: Partial<Item>) => setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item))
  const pageUrl = (route: string) => {
    const normalizedRoute = route.replace(/^\/|\/$/g, '')
    return normalizedRoute ? `${import.meta.env.BASE_URL}${normalizedRoute}/` : import.meta.env.BASE_URL
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    const accepted = incoming.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 25 * 1024 * 1024)
    const remaining = Math.max(0, 20 - items.length)
    const selected = accepted.slice(0, remaining)
    if (selected.length !== incoming.length) setNotice('Some files were skipped. Use JPG, PNG or WebP files up to 25 MB each, with no more than 20 images total.')
    if (!selected.length) return
    setItems(current => [...current, ...selected.map(file => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`, file, preview: URL.createObjectURL(file), busy: false,
    }))])
  }

  async function compress(item: Item) {
    updateItem(item.id, { busy: true, error: undefined, result: undefined })
    try {
      const result = await processImage(item.file, {
        format, quality: quality / 100,
        maxWidth: maxWidth ? Number(maxWidth) : undefined,
        maxHeight: maxHeight ? Number(maxHeight) : undefined,
        targetKB: targetKB ? Number(targetKB) : undefined,
      })
      updateItem(item.id, { result, busy: false })
    } catch (error) {
      updateItem(item.id, { error: error instanceof Error ? error.message : 'Image processing failed.', busy: false })
    }
  }

  async function compressAll() {
    setNotice('')
    for (const item of items) await compress(item)
  }

  function download(item: Item) {
    if (!item.result) return
    const url = URL.createObjectURL(item.result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeOutputName(item.file.name, item.result.format)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function removeItem(item: Item) {
    URL.revokeObjectURL(item.preview)
    setItems(current => current.filter(entry => entry.id !== item.id))
  }

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href={pageUrl('/')} aria-label="PixelShrink home"><span className="brand-mark"><FileImage size={20}/></span>PixelShrink</a>
      <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a></nav>
      <a className="nav-cta" href="#compressor">Try it free <ArrowRight size={15}/></a>
    </header>

    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> FREE ONLINE IMAGE TOOL</div>
        <h1>{page.heading}</h1>
        <p className="hero-copy">{page.intro}</p>
        <div className="trust-line"><span><Check size={14}/> No signup</span><span><Check size={14}/> No watermark</span><span><LockKeyhole size={14}/> Files stay on your device</span></div>
      </section>

      <section className="tool-card" id="compressor" aria-label="Image compression tool">
        <div className={`dropzone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={event => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }}/>
          <div className="upload-icon"><ImagePlus size={25}/></div>
          <h2>Drop your images here</h2>
          <p>or choose files from your device</p>
          <button className="button button-primary" onClick={() => inputRef.current?.click()}>Choose images</button>
          <small>JPG, PNG or WebP · Up to 25 MB per image · 20 images at a time</small>
        </div>

        <div className="settings">
          <div className="settings-heading"><span><SlidersHorizontal size={17}/> Compression settings</span><span className="subtle">Adjust before processing</span></div>
          <div className="settings-grid">
            <label>Output format
              <span className="select-wrap"><select value={format} onChange={e => setFormat(e.target.value as OutputFormat)}><option value="image/webp">WebP (best for websites)</option><option value="image/jpeg">JPG (widest compatibility)</option><option value="image/png">PNG (lossless, transparency)</option></select><ChevronDown size={15}/></span>
            </label>
            <label>Target file size (optional)
              <span className="input-wrap"><input type="number" min="1" max="25000" step="1" placeholder="e.g. 200" value={targetKB} onChange={e => setTargetKB(e.target.value)}/><span>KB</span></span>
            </label>
            <label>Max width (optional)
              <span className="input-wrap"><input type="number" min="1" max="12000" step="10" placeholder="Original" value={maxWidth} onChange={e => setMaxWidth(e.target.value)}/><span>px</span></span>
            </label>
            <label>Max height (optional)
              <span className="input-wrap"><input type="number" min="1" max="12000" step="10" placeholder="Original" value={maxHeight} onChange={e => setMaxHeight(e.target.value)}/><span>px</span></span>
            </label>
          </div>
          <div className="target-presets" role="group" aria-label="Common target file sizes">
            <span>Quick target</span>
            {[['200 KB', '200'], ['500 KB', '500'], ['1 MB', '1024']].map(([label, value]) => <button key={value} className={targetKB === value ? 'preset-button active' : 'preset-button'} aria-pressed={targetKB === value} onClick={() => setTargetKB(targetKB === value ? '' : value)}>{label}</button>)}
          </div>
          <label className={`quality-control ${targetKB || format === 'image/png' ? 'disabled' : ''}`}>
            <span>Image quality <strong>{quality}%</strong></span>
            <input type="range" min="10" max="95" value={quality} disabled={!!targetKB || format === 'image/png'} onChange={e => setQuality(Number(e.target.value))}/>
            <span className="range-labels"><small>Smaller file</small><small>Higher quality</small></span>
            {targetKB && format !== 'image/png' && <small>Quality is adjusted to try to meet your target.</small>}
            {targetKB && format === 'image/png' && <small>PNG is lossless; reduce the dimensions to reach a smaller target.</small>}
            {!targetKB && format === 'image/png' && <small>PNG is lossless; quality setting does not apply.</small>}
          </label>
          <div className="settings-footer"><span><ShieldCheck size={15}/> Processing happens locally in your browser</span><button className="button button-primary" disabled={!items.length || items.some(item => item.busy)} onClick={compressAll}>Compress {items.length ? `${items.length} image${items.length > 1 ? 's' : ''}` : 'images'} <ArrowRight size={16}/></button></div>
        </div>

        {notice && <div className="notice" role="status">{notice}</div>}
        {items.length > 0 && <div className="results">
          <div className="results-heading"><div><h3>Your images <span className="count">{items.length}</span></h3><p>{items.some(item => item.result) ? `Total saved: ${formatBytes(totalSaved)}` : 'Ready to process'}</p></div><button className="text-button" onClick={() => { items.forEach(item => URL.revokeObjectURL(item.preview)); setItems([]) }}>Clear all</button></div>
          {items.map(item => <article className="file-row" key={item.id}>
            <img src={item.preview} alt={`Preview of ${item.file.name}`}/>
            <div className="file-info"><strong title={item.file.name}>{item.file.name}</strong><span>{formatBytes(item.file.size)}{item.result ? ` → ${formatBytes(item.result.blob.size)}` : ''}</span>
              {item.result && <span className={item.result.reachedTarget ? 'saved' : 'warning'}>{item.result.reachedTarget ? sizeChangeLabel(item.file.size, item.result.blob.size) : 'Target size could not be reached at this resolution'}</span>}
              {item.error && <span className="warning">{item.error}</span>}
              {item.busy && <span className="processing">Processing…</span>}
            </div>
            <div className="file-actions">{item.result && <button className="icon-button download" aria-label="Download image" onClick={() => download(item)}><ArrowDownToLine size={18}/></button>}<button className="icon-button" aria-label="Remove image" onClick={() => removeItem(item)}><X size={17}/></button></div>
          </article>)}
        </div>}
      </section>

      <section className="benefits" id="privacy">
        <div className="section-intro"><span className="eyebrow">SIMPLE BY DESIGN</span><h2>Your images stay yours.</h2><p>PixelShrink processes images directly in your browser. Your original files are not uploaded to our servers.</p></div>
        <div className="benefit-grid">
          <div><span className="benefit-icon"><LockKeyhole/></span><h3>Private by default</h3><p>Image processing runs on your device. No image storage or account required.</p></div>
          <div><span className="benefit-icon"><RefreshCw/></span><h3>Fast and simple</h3><p>Choose your settings, process your images and download the results.</p></div>
          <div><span className="benefit-icon"><ShieldCheck/></span><h3>No hidden limits</h3><p>No watermark and no signup. Current limits are shown before you upload.</p></div>
        </div>
      </section>

      <section className="how" id="how-it-works"><div className="section-intro"><span className="eyebrow">THREE SIMPLE STEPS</span><h2>Smaller images in seconds.</h2></div><div className="steps"><div><b>01</b><h3>Choose images</h3><p>Select JPG, PNG or WebP files from your device.</p></div><div><b>02</b><h3>Set your options</h3><p>Choose a format, quality, dimensions or target file size.</p></div><div><b>03</b><h3>Download</h3><p>Compare the result and save your optimized image.</p></div></div></section>

      {path === '/' && <section className="more-tools">
        <div className="section-intro"><span className="eyebrow">More Free Tools</span><h2>Find the right image tool.</h2></div>
        <div className="more-tool-grid">
          <a href={pageUrl('/image-resizer')}><h3>Image Resizer</h3><p>Resize images to the width and height you need.</p></a>
          <a href={pageUrl('/jpg-to-webp')}><h3>JPG to WebP Converter</h3><p>Convert JPG images to WebP right in your browser.</p></a>
          <a href={pageUrl('/compress-image-to-200kb')}><h3>Compress Image to 200 KB</h3><p>Try to meet a 200 KB target with adjustable compression.</p></a>
        </div>
      </section>}

      <section className="faq"><div className="section-intro"><span className="eyebrow">GOOD TO KNOW</span><h2>Frequently asked questions</h2></div>
        <details><summary>Are my images uploaded to a server?</summary><p>No. Image decoding, resizing and compression happen in your browser. The website does not send image files to a processing server.</p></details>
        <details><summary>Which image formats are supported?</summary><p>PixelShrink accepts JPG, PNG and WebP images. You can export as JPG, PNG or WebP, subject to browser support.</p></details>
        <details><summary>Can every image be compressed to 200 KB?</summary><p>Not always. Very large or detailed images may need to be resized to reach a strict target. PixelShrink reports when the requested target could not be achieved.</p></details>
        <details><summary>Will image quality change?</summary><p>Lossy JPG and WebP compression can reduce image quality. PNG output is lossless from the canvas representation, but re-encoding may remove metadata and may not preserve every original file property.</p></details>
      </section>
    </main>

    <footer><a className="brand" href={pageUrl('/')}><span className="brand-mark"><FileImage size={18}/></span>PixelShrink</a><span>Free image tools. Private by design.</span><div><a href={pageUrl('/image-resizer')}>Image resizer</a><a href={pageUrl('/jpg-to-webp')}>JPG to WebP</a><a href={pageUrl('/compress-image-to-200kb')}>200 KB compressor</a></div><small>© {new Date().getFullYear()} PixelShrink</small></footer>
  </div>
}

export default App