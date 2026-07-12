const supportedTypes = new Set(['image/png', 'image/webp', 'image/svg+xml'])

type ArrowFileDescriptor = Pick<File, 'name' | 'type'>

export function isSupportedArrowFile(file: ArrowFileDescriptor) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return supportedTypes.has(file.type) || extension === 'png' || extension === 'webp' || extension === 'svg'
}

export function sanitizeArrowSvg(source: string) {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml')
  if (document.querySelector('parsererror')) {
    throw new Error('SVG 文件无法解析')
  }

  document.querySelectorAll('script, foreignObject').forEach((node) => node.remove())
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || ((name === 'href' || name.endsWith(':href')) && /^(?:https?:|\/\/|javascript:)/u.test(value))) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}

function dataUrlForFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('箭头图片读取失败'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function imageAspectRatio(url: string) {
  return new Promise<number>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1)
    image.onerror = () => resolve(1)
    image.src = url
  })
}

export async function readArrowAsset(file: File) {
  if (!isSupportedArrowFile(file)) {
    throw new Error('仅支持 PNG、WebP 或 SVG 箭头图片')
  }

  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const safeSvg = sanitizeArrowSvg(await file.text())
    const parsed = new DOMParser().parseFromString(safeSvg, 'image/svg+xml').documentElement
    const viewBox = parsed.getAttribute('viewBox')?.split(/\s+/u).map(Number)
    const width = viewBox?.[2] || Number.parseFloat(parsed.getAttribute('width') ?? '') || 1
    const height = viewBox?.[3] || Number.parseFloat(parsed.getAttribute('height') ?? '') || 1
    return {
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`,
      aspectRatio: width / height,
    }
  }

  const dataUrl = await dataUrlForFile(file)
  return { dataUrl, aspectRatio: await imageAspectRatio(dataUrl) }
}
