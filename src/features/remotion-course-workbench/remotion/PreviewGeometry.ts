import type { CSSProperties } from 'react'

export type PreviewSize = {
  width: number
  height: number
}

export type CompositionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type PreviewTransform = {
  scale: number
  offsetX: number
  offsetY: number
}

function normalizeGeometryValue(value: number): number {
  if (Math.abs(value) < 1e-9) {
    return 0
  }

  const nearestInteger = Math.round(value)
  return Math.abs(value - nearestInteger) < 1e-9 ? nearestInteger : value
}

export function calculateContainTransform(
  composition: PreviewSize,
  preview: PreviewSize,
): PreviewTransform {
  const scale = Math.min(preview.width / composition.width, preview.height / composition.height)
  return {
    scale,
    offsetX: normalizeGeometryValue((preview.width - composition.width * scale) / 2),
    offsetY: normalizeGeometryValue((preview.height - composition.height * scale) / 2),
  }
}

export function mapCompositionRectToPreview(
  rect: CompositionRect,
  transform: PreviewTransform,
): CompositionRect {
  return {
    x: normalizeGeometryValue(rect.x * transform.scale + transform.offsetX),
    y: normalizeGeometryValue(rect.y * transform.scale + transform.offsetY),
    width: normalizeGeometryValue(rect.width * transform.scale),
    height: normalizeGeometryValue(rect.height * transform.scale),
  }
}

export function editorCanvasStyle(
  composition: PreviewSize,
  transform: PreviewTransform,
): CSSProperties {
  return {
    width: `${composition.width}px`,
    height: `${composition.height}px`,
    transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
    transformOrigin: 'top left',
  }
}
