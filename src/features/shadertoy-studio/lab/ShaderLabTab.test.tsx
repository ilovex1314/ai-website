import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLabState } from './shaderLessons'
import { ShaderLabTab } from './ShaderLabTab'

vi.mock('../runtime/ShaderCanvas', () => ({
  ShaderCanvas: ({ request, onCompileResult }: {
    request: { revision: number }
    onCompileResult: (result: { ok: true; profile: 'webgl1' }) => void
  }) => {
    const callback = useRef(onCompileResult)
    callback.current = onCompileResult
    useEffect(() => callback.current({ ok: true, profile: 'webgl1' }), [request.revision])
    return <div data-testid="shader-canvas-host" />
  },
}))

afterEach(cleanup)

function LabHarness() {
  const [state, setState] = useState(createLabState)
  return <ShaderLabTab state={state} onChange={setState} onCheckMigration={vi.fn()} />
}

describe('ShaderLabTab', () => {
  it('preserves drafts and reveals the explanation after an explicit run', async () => {
    const user = userEvent.setup()
    render(<LabHarness />)
    expect(screen.getAllByRole('button', { name: /实验 \d/ })).toHaveLength(5)
    fireEvent.change(screen.getByLabelText('GLSL mainImage 源码'), {
      target: { value: 'void mainImage(out vec4 c, in vec2 p) { c = vec4(1.0); }' },
    })
    await user.click(screen.getByRole('radio', { name: '亮黄' }))
    await user.click(screen.getByRole('button', { name: '运行代码' }))
    expect(await screen.findByText(/运行结果解释/)).toBeInTheDocument()
    expect(screen.getByText(/React 创建 canvas/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '恢复本节源码' }))
    expect((screen.getByLabelText('GLSL mainImage 源码') as HTMLTextAreaElement).value).toContain('fragCoord')
  })
})
