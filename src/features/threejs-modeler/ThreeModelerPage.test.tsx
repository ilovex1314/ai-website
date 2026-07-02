import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThreeModelerPage } from './ThreeModelerPage'

afterEach(() => {
  cleanup()
})

describe('ThreeModelerPage', () => {
  it('renders the modeler workspace for Chinese Three.js learners', () => {
    render(<ThreeModelerPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Three\.js 轻量 3D 建模实验室/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /添加立方体/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /添加球体/ })).toBeInTheDocument()
    expect(screen.getByText(/对象树/)).toBeInTheDocument()
    expect(screen.getByLabelText(/生成模式/)).toBeInTheDocument()
    expect(screen.getByText(/可持久化数据结构/)).toBeInTheDocument()
  })

  it('shows the default selected part in the inspector', () => {
    render(<ThreeModelerPage />)

    expect(screen.getByDisplayValue('底座立方体')).toBeInTheDocument()
    expect(screen.getByLabelText('颜色')).toHaveValue('#58d7c5')
    expect(screen.getByText(/当前模型包含 3 个零件/)).toBeInTheDocument()
  })

  it('keeps saved models editable and uses saved scenes as the final generation source', async () => {
    const user = userEvent.setup()
    render(<ThreeModelerPage />)

    await user.click(screen.getByRole('button', { name: '添加圆锥' }))
    expect(screen.getByText(/当前模型包含 4 个零件/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存为组合体' }))
    const savedModelItem = screen.getByRole('listitem', { name: /Three\.js 入门组合模型 1/ })
    expect(savedModelItem).toBeInTheDocument()
    expect(within(savedModelItem).getByRole('button', { name: '编辑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '加入场景' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加球体' }))
    expect(screen.getByText(/当前模型包含 5 个零件/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '加入场景' }))
    expect(screen.getByText(/当前模型包含 5 个零件/)).toBeInTheDocument()
    expect(screen.getByText(/当前场景包含 1 个对象/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存为场景' }))
    expect(screen.getByRole('listitem', { name: /Three\.js 展示场景 1/ })).toBeInTheDocument()
    expect((screen.getByRole('combobox', { name: '场景' }) as HTMLSelectElement).value).toMatch(/^saved-scene-/)
    expect(screen.getByText(/已生成 9 个场景实例/)).toBeInTheDocument()

    await user.click(within(savedModelItem).getByRole('button', { name: '编辑' }))
    expect(screen.getByText(/当前模型包含 4 个零件/)).toBeInTheDocument()
  })
})
