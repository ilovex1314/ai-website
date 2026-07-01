import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SplineProductShowcase } from './SplineProductShowcase'
import { actionSixInspiredShowcase } from './splineShowcaseData'

afterEach(() => {
  cleanup()
})

describe('SplineProductShowcase', () => {
  it('renders a focused product showcase without teaching copy on the page', () => {
    render(<SplineProductShowcase />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Action 6 灵感 3D 产品展示',
    )
    expect(screen.getByText(actionSixInspiredShowcase.product.name)).toBeInTheDocument()
    expect(screen.getByText(/非 DJI 官方 3D 资产/)).toHaveTextContent('模型保留原创水印')
    expect(screen.getByTestId('local-action-camera-model')).toBeInTheDocument()
    expect(screen.queryByTestId('spline-public-scene')).not.toBeInTheDocument()
    expect(screen.queryByText(/三种 Spline 3D 渲染模式 demo/)).not.toBeInTheDocument()
    expect(screen.queryByText(/产品事实如何进入 3D 页面/)).not.toBeInTheDocument()
    expect(screen.queryByText(/本地原创模型数据/)).not.toBeInTheDocument()
  })

  it('uses the product scene structure as the top-level data contract', () => {
    expect(actionSixInspiredShowcase.product.id).toBe('action-6-inspired')
    expect(actionSixInspiredShowcase.scene.provider).toBe('spline')
    expect(actionSixInspiredShowcase.scene.embedMode).toBe('local-css-3d')
    expect(actionSixInspiredShowcase.scene.sceneUrl).toBeUndefined()
    expect(actionSixInspiredShowcase.scene.sourceAsset).toMatchObject({
      format: 'glb',
      url: '/models/action-6-inspired/action-6-inspired-study.glb',
    })
    expect(actionSixInspiredShowcase.hotspots.map((hotspot) => hotspot.partId)).toContain(
      'lens',
    )
    expect(actionSixInspiredShowcase.model.dimensionsMm).toEqual({
      width: 72.8,
      height: 47.2,
      depth: 33.1,
    })
  })

  it('keeps hotspot details and local source metadata beside the Spline scene', () => {
    render(<SplineProductShowcase />)

    expect(screen.getByText(/f\/2\.0-f\/4\.0 可变光圈/)).toBeInTheDocument()
    expect(screen.getByText('/models/action-6-inspired/local-model.json')).toBeInTheDocument()
    expect(
      screen.getByText('/models/action-6-inspired/action-6-inspired-study.glb'),
    ).toBeInTheDocument()
  })
})
