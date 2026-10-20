export type SignatureFields = {
  firstName: string
  lastName: string
  jobTitle: string
  phone: string
  email: string
}

export type BannerState = {
  fileDataUrl: string
  fileWidth: number
  url: string
  link: string
}

export function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function formatDisplayName(firstName: string, lastName: string): { first: string; last: string } {
  const first = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
  const last = lastName.toUpperCase()
  return { first, last }
}

function bannerSrc(banner: BannerState): string {
  const url = banner.url.trim()
  return url || banner.fileDataUrl
}

export function buildBannerHtml(banner: BannerState): string {
  const src = bannerSrc(banner)
  if (!src) return ''
  const link = banner.link.trim()
  const width = banner.fileDataUrl && !banner.url.trim() ? banner.fileWidth : 480
  const img = `<img src="${escapeAttr(src)}" alt="" width="${width}" style="display:block;border:0;outline:none;text-decoration:none;max-width:${width}px;height:auto;">`
  const inner = /^https?:\/\//i.test(link)
    ? `<a href="${escapeAttr(link)}" target="_blank" style="display:block;">${img}</a>`
    : img
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
  <tr>
    <td>${inner}</td>
  </tr>
</table>`
}

export function buildSignatureHtml(
  fields: SignatureFields,
  greeting: string,
  banner: BannerState,
): string {
  const { first, last } = formatDisplayName(fields.firstName.trim(), fields.lastName.trim())
  const logoHtml =
    '<a href="https://www.mida.lt" target="_blank" style="display:block;"><img src="https://mida.lt/mida_logo.png" alt="MIDA" width="120" style="display:block;border:0;"></a>'
  return `<p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:12px;color:#111;">--</p>
<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:12px;color:#111;">${greeting}</p>
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;">
  <tr>
    <td style="vertical-align:middle;padding:16px 20px 16px 0;">${logoHtml}</td>
    <td style="width:2px;background:#215E99;padding:0;"></td>
    <td style="vertical-align:top;padding:16px 0 16px 20px;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111;">${first} ${last}</p>
      <p style="margin:0 0 4px 0;font-size:11px;color:#111;">${fields.jobTitle.trim()}</p>
      <p style="margin:0 0 4px 0;font-size:11px;color:#111;">${fields.phone.trim()}</p>
      <p style="margin:0 0 14px 0;font-size:11px;color:#111;"><a href="mailto:${fields.email.trim()}" style="color:#111;text-decoration:none;">${fields.email.trim()}</a></p>
      <p style="margin:0;font-size:11px;"><a href="https://www.mida.lt" target="_blank" style="color:#111;text-decoration:none;">www.mida.lt</a></p>
    </td>
  </tr>
</table>${buildBannerHtml(banner)}`
}

export function emptyBanner(): BannerState {
  return { fileDataUrl: '', fileWidth: 480, url: '', link: '' }
}

export async function fileToBannerDataUrl(file: File): Promise<{ dataUrl: string; width: number }> {
  if (file.type === 'image/gif') {
    const dataUrl = await readAsDataUrl(file)
    return { dataUrl, width: 480 }
  }
  const objUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objUrl)
    const maxW = 600
    let w = img.naturalWidth
    let h = img.naturalHeight
    if (w > maxW) {
      h = Math.round((h * maxW) / w)
      w = maxW
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const isPng = file.type === 'image/png'
    const dataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88)
    return { dataUrl, width: w }
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = src
  })
}

export async function copyHtmlToClipboard(html: string): Promise<boolean> {
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const blob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })])
      return true
    } catch {
      // fall through
    }
  }

  try {
    const el = document.createElement('div')
    el.contentEditable = 'true'
    el.innerHTML = html
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    el.style.top = '0'
    el.style.opacity = '0'
    document.body.appendChild(el)
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    const ok = document.execCommand('copy')
    sel?.removeAllRanges()
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
