import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { CourseActionLibraryStudio } from './CourseActionLibraryStudio'

afterEach(cleanup)

describe('CourseActionLibraryStudio', () => {
  it('shows the selected action as a single-element live demo', () => {
    render(<CourseActionLibraryStudio />)

    expect(screen.getByRole('heading', { name: '实时 Demo' })).toBeInTheDocument()
    expect(screen.getByTestId('action-live-demo')).toHaveAttribute('data-action-category', 'highlight')
    expect(screen.getByTestId('action-demo-subject')).toHaveTextContent('课程核心概念')
    expect(screen.getAllByTestId('action-demo-subject')).toHaveLength(1)
    expect(screen.getByText('蓝色定义高亮框', { selector: '.action-live-demo__title' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暂停 Demo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重播 Demo' })).toBeInTheDocument()
  })

  it('updates and replays the demo when another action is selected', async () => {
    const user = userEvent.setup()
    render(<CourseActionLibraryStudio />)

    await user.click(screen.getByRole('button', { name: /红色圈注/ }))

    expect(screen.getByRole('button', { name: /红色圈注/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('action-live-demo')).toHaveAttribute('data-action-category', 'circle')
    expect(screen.getByText('红色圈注', { selector: '.action-live-demo__title' })).toBeInTheDocument()
    expect(screen.getByTestId('action-live-visual')).toHaveClass('preview-action--circle')
  })

  it('classifies actions by whether they animate an existing element or add a new element', async () => {
    const user = userEvent.setup()
    render(<CourseActionLibraryStudio />)

    expect(screen.getAllByText('资产类型').length).toBeGreaterThan(0)
    expect(screen.getAllByText('动作分类').length).toBeGreaterThan(0)
    expect(screen.queryByText('Mode')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加动画' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '添加元素 + 动画' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '动作分类筛选' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '添加元素 + 动画' }))

    expect(screen.getByRole('button', { name: /^指向添加元素/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /蓝色定义高亮框/ })).not.toBeInTheDocument()
  })

  it('switches the pointing component shape in the live demo', async () => {
    const user = userEvent.setup()
    render(<CourseActionLibraryStudio />)

    await user.click(screen.getByRole('button', { name: /^指向添加元素/ }))
    expect(screen.getByTestId('pointing-arrow-visual')).toHaveAttribute('data-arrow-shape', 'straight')

    await user.click(screen.getByRole('button', { name: '曲线' }))
    expect(screen.getByTestId('pointing-arrow-visual')).toHaveAttribute('data-arrow-shape', 'curve')
    expect(screen.getByTestId('pointing-arrow-editor')).toBeInTheDocument()
  })
})
