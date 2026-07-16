import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShadertoyStudioPage } from './ShadertoyStudioPage'

vi.mock('./runtime/ShaderCanvas', () => ({
  ShaderCanvas: () => <div data-testid="shader-canvas-host" />,
}))

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/topics/shadertoy')
})

describe('ShadertoyStudioPage', () => {
  it('uses the query string and keyboard to navigate three tabs', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/topics/shadertoy?view=porting')
    render(<ShadertoyStudioPage />)
    expect(screen.getByRole('tab', { name: '迁移工作台' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: '迁移工作台' })).toBeInTheDocument()
    screen.getByRole('tab', { name: '迁移工作台' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: '引导实验室' })).toHaveFocus()
    expect(window.location.search).toBe('?view=lab')
  })

  it('preserves gallery state and carries explicit handoffs across tabs', async () => {
    const user = userEvent.setup()
    render(<ShadertoyStudioPage />)
    await user.click(screen.getByRole('button', { name: /选择作品 Liquid Grid/ }))
    await user.click(screen.getByRole('button', { name: '去实验室拆解' }))
    expect(screen.getByText('来自作品展厅')).toBeInTheDocument()
    expect(screen.getByText('Liquid Grid')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '作品展厅' }))
    expect(screen.getByRole('heading', { name: 'Liquid Grid' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '检查迁移' }))
    expect(screen.getByRole('tab', { name: '迁移工作台' })).toHaveAttribute('aria-selected', 'true')
    expect((screen.getByLabelText('Shadertoy Image 源码') as HTMLTextAreaElement).value).toContain('p *=')
  })
})
