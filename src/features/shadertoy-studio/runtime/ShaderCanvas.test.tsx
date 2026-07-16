import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShaderCanvas } from './ShaderCanvas'

vi.mock('./useShaderCanvas', () => ({
  useShaderCanvas: () => ({ hostRef: { current: null }, status: 'unavailable' }),
}))

describe('ShaderCanvas', () => {
  it('exposes a stable host and an accessible WebGL fallback', () => {
    render(<ShaderCanvas
      request={{
        source: 'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }',
        profile: 'webgl1',
        revision: 1,
      }}
      uniforms={{}}
      playing={false}
      quality={1}
      initialElapsed={0}
      ariaLabel="测试 Shader"
      onCompileResult={vi.fn()}
      onElapsedChange={vi.fn()}
    />)
    expect(screen.getByTestId('shader-canvas-host')).toBeInTheDocument()
    expect(screen.getByText('当前浏览器无法创建 WebGL 画布。')).toBeInTheDocument()
  })
})
