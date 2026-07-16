import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGalleryState } from './galleryPresets'
import { ShaderGalleryTab } from './ShaderGalleryTab'

vi.mock('../runtime/ShaderCanvas', () => ({
  ShaderCanvas: () => <div data-testid="shader-canvas-host" />,
}))

afterEach(cleanup)

describe('ShaderGalleryTab', () => {
  it('selects presets, edits uniforms, and changes website framing', async () => {
    const user = userEvent.setup()
    let state = createGalleryState()
    const onChange = vi.fn((next) => { state = next })
    const { rerender } = render(
      <ShaderGalleryTab state={state} onChange={onChange} onInspectInLab={vi.fn()} onCheckMigration={vi.fn()} />,
    )
    expect(screen.getAllByRole('button', { name: /选择作品/ })).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: /选择作品 Liquid Grid/ }))
    rerender(<ShaderGalleryTab state={state} onChange={onChange} onInspectInLab={vi.fn()} onCheckMigration={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Liquid Grid' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Hero 横幅' }))
    expect(onChange).toHaveBeenCalled()
    expect(screen.getByLabelText('动画速度')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '去实验室拆解' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查迁移' })).toBeInTheDocument()
  })
})
