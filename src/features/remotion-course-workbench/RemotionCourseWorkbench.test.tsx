import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { RemotionCourseWorkbench } from './RemotionCourseWorkbench'

afterEach(() => {
  cleanup()
})

describe('RemotionCourseWorkbench', () => {
  it('renders a production workbench with timeline, assets, library, preview, and Codex handoff', () => {
    render(<RemotionCourseWorkbench />)

    expect(screen.getByRole('heading', { level: 1, name: /Studio Console/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Assets/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Timeline/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Action Library Manager/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Inspector/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Review 预览/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Project Package/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /CapCut Handoff/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Local Codex/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /打开动作库子页面/ })).toHaveAttribute(
      'href',
      '/topics/remotion-course/actions',
    )
    expect(screen.getByRole('button', { name: /蓝色定义高亮框/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filters actions and creates a draft action in the selected category', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: '文字卡' }))
    expect(screen.getByRole('button', { name: /重点文字卡片/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /蓝色定义高亮框/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /新增动作/ }))
    expect(screen.getByRole('button', { name: /新建重点文字卡动作/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('动作状态')).toHaveValue('draft')
  })

  it('edits action params and updates the review preview immediately', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.clear(screen.getByLabelText('动作名称'))
    await user.type(screen.getByLabelText('动作名称'), '核心定义高亮')
    await user.clear(screen.getByLabelText('标签'))
    await user.type(screen.getByLabelText('标签'), '结构化输入')
    await user.clear(screen.getByLabelText('颜色'))
    await user.type(screen.getByLabelText('颜色'), '#d97706')

    expect(screen.getByRole('button', { name: /核心定义高亮/ })).toBeInTheDocument()
    expect(screen.getByTestId('preview-action')).toHaveTextContent('结构化输入')
    expect(screen.getByLabelText('颜色')).toHaveValue('#d97706')
  })

  it('duplicates and deletes the selected action', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /复制动作/ }))
    const duplicated = screen.getByRole('button', { name: /蓝色定义高亮框 副本/ })
    expect(duplicated).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /删除动作/ }))
    expect(screen.queryByRole('button', { name: /蓝色定义高亮框 副本/ })).not.toBeInTheDocument()
  })

  it('drags a preview annotation and generates a local Codex handoff request', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    const preview = screen.getByTestId('preview-canvas')
    fireEvent.pointerDown(preview, { clientX: 180, clientY: 150 })
    fireEvent.pointerMove(preview, { clientX: 240, clientY: 210 })
    fireEvent.pointerUp(preview)

    expect(screen.getByLabelText('X')).toHaveValue(34)
    expect(screen.getByLabelText('Y')).toHaveValue(42)

    await user.type(
      screen.getByLabelText('Review 意见'),
      '把高亮框移动到第二个流程节点，并把颜色改成警示橙。',
    )
    await user.click(screen.getByRole('button', { name: /生成 Codex 修改请求/ }))

    const handoff = screen.getByTestId('codex-handoff-output')
    expect(handoff).toHaveTextContent('"environment": "local-only"')
    expect(handoff).toHaveTextContent('把高亮框移动到第二个流程节点')
    expect(handoff).toHaveTextContent('/Volumes/2TB-NVMe/work/ai-website')
    expect(screen.getByText(/公网部署只展示平台/)).toBeInTheDocument()
  })

  it('shows project-file first exports and CapCut handoff files', () => {
    render(<RemotionCourseWorkbench />)

    expect(screen.getByTestId('project-package-output')).toHaveTextContent('course-project/project.json')
    expect(screen.getByTestId('project-package-output')).toHaveTextContent('course-project/actions/highlight-box.json')
    expect(screen.getByTestId('project-package-output')).toHaveTextContent('course-project/actions/code-line-highlight.json')
    expect(screen.getByTestId('project-package-output')).toHaveTextContent('primarySource')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('master-preview.mp4')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('overlays/002-highlight-box-alpha.webm')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('overlays/008-code-line-highlight-alpha.webm')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('"overlayCount": 11')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('edit-guide.md')
  })
})
