import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialPortingState } from './portingModel'
import { ShaderPortingTab } from './ShaderPortingTab'

vi.mock('../runtime/ShaderCanvas', () => ({
  ShaderCanvas: ({ request, onCompileResult }: {
    request: { revision: number; profile: 'webgl1' | 'webgl2' }
    onCompileResult: (result: { ok: true; profile: 'webgl1' | 'webgl2' }) => void
  }) => {
    const callback = useRef(onCompileResult)
    callback.current = onCompileResult
    useEffect(() => callback.current({ ok: true, profile: request.profile }), [request.profile, request.revision])
    return <div data-testid="shader-canvas-host" />
  },
}))

afterEach(cleanup)

function PortingHarness() {
  const [state, setState] = useState(createInitialPortingState)
  return <ShaderPortingTab state={state} onChange={setState} onAcceptHandoff={vi.fn()} onRejectHandoff={vi.fn()} />
}

const readySource = 'uniform float glow; void mainImage(out vec4 c, in vec2 p) { c = vec4(glow); }'
const channelSource = 'void mainImage(out vec4 c, in vec2 p) { c = texture2D(iChannel0, p); }'

describe('ShaderPortingTab', () => {
  it('analyzes, verifies, and invalidates a single-pass recipe', async () => {
    const user = userEvent.setup()
    render(<PortingHarness />)
    fireEvent.change(screen.getByLabelText('Shadertoy Image 源码'), { target: { value: readySource } })
    await user.click(screen.getByRole('button', { name: '分析兼容性' }))
    expect(screen.getByText('需要宿主输入')).toBeInTheDocument()
    expect(screen.getByLabelText('glow (float)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '尝试运行' }))
    expect(await screen.findByRole('heading', { name: /React 接入配方/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Shadertoy Image 源码'), { target: { value: `${readySource}\n// changed` } })
    expect(screen.queryByRole('heading', { name: /React 接入配方/ })).not.toBeInTheDocument()
  })

  it('blocks unknown channels with actionable guidance', async () => {
    const user = userEvent.setup()
    render(<PortingHarness />)
    fireEvent.change(screen.getByLabelText('Shadertoy Image 源码'), { target: { value: channelSource } })
    await user.click(screen.getByRole('button', { name: '分析兼容性' }))
    expect(screen.getByText('发现 Channel 依赖')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '尝试运行' })).toBeDisabled()
    expect(screen.getByText(/外部输入来源未知/)).toBeInTheDocument()
    expect(screen.getByText(/frame binding/)).toBeInTheDocument()
  })
})
