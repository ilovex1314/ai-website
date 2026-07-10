import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import { CoursePreviewStage } from './CoursePreviewStage'
import { RemotionCourseWorkbench } from './RemotionCourseWorkbench'

beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RemotionCourseWorkbench', () => {
  it('renders Media Intake for a HyperFrames project folder and foreground speaker video', () => {
    render(<RemotionCourseWorkbench />)

    expect(screen.getByRole('heading', { level: 2, name: 'Media Intake' })).toBeInTheDocument()
    expect(screen.getByText('Codex Keyframes Tutorial')).toBeInTheDocument()
    expect(screen.getByText('/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial')).toBeInTheDocument()
    expect(screen.getByTestId('case-duration')).toHaveTextContent('158s')
    expect(screen.getByTestId('case-duration')).toHaveTextContent('4740f')
    expect(screen.getByText('后台区')).toBeInTheDocument()
    expect(screen.getByText('前台区')).toBeInTheDocument()
    expect(screen.getByText('HyperFrames Project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /导入 HyperFrames 文件夹/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /上传口播视频/ })).toBeInTheDocument()
    expect(screen.getByText(/scenes parsed/)).toBeInTheDocument()
    expect(screen.getByText(/animations detected/)).toBeInTheDocument()
  })

  it('switches canvas aspect ratio from the review toolbar', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    expect(screen.getByTestId('preview-canvas')).toHaveAttribute('data-aspect-ratio', '9:16')
    expect(screen.getByLabelText('画布比例')).toHaveValue('9:16')
    expect(screen.getByLabelText('课程项目概览')).toHaveTextContent('9:16')
    expect(screen.getByLabelText('课程项目概览')).not.toHaveTextContent('16:9')

    await user.selectOptions(screen.getByLabelText('画布比例'), '4:3')
    expect(screen.getByTestId('preview-canvas')).toHaveAttribute('data-aspect-ratio', '4:3')
    expect(screen.getByTestId('preview-media-frame')).toHaveAttribute('data-source-aspect-ratio', '9:16')

    await user.selectOptions(screen.getByLabelText('画布比例'), '9:16')
    expect(screen.getByTestId('preview-canvas')).toHaveAttribute('data-aspect-ratio', '9:16')
  })

  it('maps background elements and action overlays to the 9:16 media frame instead of the canvas shell', () => {
    const { container } = render(<RemotionCourseWorkbench />)

    const mediaFrame = screen.getByTestId('preview-media-frame')
    const titleElement = Array.from(container.querySelectorAll('.stage-element-box')).find(
      (element) => element.textContent === '视频标题',
    )
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })
    const actionOverlay = container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')

    expect(mediaFrame).toHaveAttribute('data-source-aspect-ratio', '9:16')
    expect(mediaFrame).toContainElement(screen.getByTestId('background-preview-video'))
    expect(mediaFrame).toContainElement(titleElement as HTMLElement)
    expect(mediaFrame).toContainElement(actionOverlay as HTMLElement)
    expect(screen.getByTestId('preview-canvas')).not.toBe(titleElement?.parentElement)
    expect(titleElement).toHaveStyle({
      left: '12%',
      top: '22%',
      width: '74%',
      height: '16%',
    })
    expect(actionOverlay).toHaveStyle({
      left: '14%',
      top: '21%',
      width: '58%',
      height: '18%',
    })
  })

  it('renders the Codex Keyframes Tutorial video as the review background without blocking element selection', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    const backgroundVideo = screen.getByTestId('background-preview-video') as HTMLVideoElement
    const videoSource = backgroundVideo.querySelector('source')

    expect(backgroundVideo.muted).toBe(true)
    expect(backgroundVideo.playsInline).toBe(true)
    expect(backgroundVideo).toHaveStyle({ pointerEvents: 'none' })
    expect(videoSource).toHaveAttribute(
      'src',
      expect.stringContaining('/@fs/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial'),
    )
    expect(videoSource).toHaveAttribute('src', expect.stringContaining('codex-keyframes-tutorial.mp4'))

    await user.click(screen.getByRole('button', { name: /视频标题/ }))
    expect(screen.getAllByText('已选元素：视频标题')).toHaveLength(2)
  })

  it('renders the foreground speaker video as the draggable primary-audio window', () => {
    render(<RemotionCourseWorkbench />)

    const foregroundVideo = screen.getByTestId('foreground-preview-video') as HTMLVideoElement
    const foregroundSource = foregroundVideo.querySelector('source')

    expect(foregroundVideo.muted).toBe(false)
    expect(foregroundVideo.playsInline).toBe(true)
    expect(foregroundVideo).toHaveClass('preview-speaker__video')
    expect(window.getComputedStyle(foregroundVideo).objectFit).toBe('contain')
    expect(foregroundSource).toHaveAttribute('src', expect.stringContaining('codex-keyframes-tutorial.mp4'))
    expect(screen.queryByText('口播')).not.toBeInTheDocument()
  })

  it('updates the playback frame and slider from the background video timeupdate without writing video time back', () => {
    render(<RemotionCourseWorkbench />)

    const backgroundVideo = screen.getByTestId('background-preview-video') as HTMLVideoElement
    const foregroundVideo = screen.getByTestId('foreground-preview-video') as HTMLVideoElement
    backgroundVideo.currentTime = 2
    foregroundVideo.currentTime = 2
    fireEvent.timeUpdate(backgroundVideo)

    expect(screen.getByLabelText('播放头')).toHaveValue('60')
    expect(screen.getByText('60 / 4740f')).toBeInTheDocument()
    expect(foregroundVideo.currentTime).toBe(2)
  })

  it('renders action overlays only for active timeline ranges', () => {
    const { container } = render(<RemotionCourseWorkbench />)

    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).not.toBeInTheDocument()
    expect(screen.getByText('Active action: lower-third')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '20' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveClass('preview-action--circle')
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveAttribute(
      'data-animation-phase',
      'enter',
    )

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '80' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveAttribute(
      'data-animation-phase',
      'emphasis',
    )

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '166' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveAttribute(
      'data-animation-phase',
      'exit',
    )

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '602' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).not.toBeInTheDocument()
    expect(screen.getByText('Active action: none')).toBeInTheDocument()
  })

  it('throttles playback timeupdate dispatches to avoid render loops during playback', () => {
    const state = createDefaultCourseWorkbenchState()
    const dispatch = vi.fn()

    render(
      <CoursePreviewStage
        action={state.actions.find((action) => action.id === state.selectedActionId) ?? state.actions[0]}
        segment={state.timeline[0]}
        stage={state.stage}
        playback={{ ...state.playback, isPlaying: true }}
        timeline={state.timeline}
        actions={state.actions}
        selectedElementId={state.selectedElementId}
        fps={state.project.fps}
        dispatch={dispatch}
      />,
    )

    const backgroundVideo = screen.getByTestId('background-preview-video') as HTMLVideoElement
    backgroundVideo.currentTime = 20
    fireEvent.timeUpdate(backgroundVideo)
    fireEvent.timeUpdate(backgroundVideo)
    fireEvent.timeUpdate(backgroundVideo)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'seek-frame', frame: 600 })
  })

  it('shows and selects later-scene DOM elements after seeking to their frame range', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '930' } })

    expect(screen.queryByRole('button', { name: /视频标题/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /代码示例区域/ }))
    expect(screen.getAllByText('已选元素：代码示例区域')).toHaveLength(2)
    expect(screen.getByTestId('element-inspector')).toHaveTextContent('尚未绑定动画')
  })

  it('plays, pauses, and seeks both media tracks from the review controls', async () => {
    const user = userEvent.setup()
    const playSpy = vi.mocked(window.HTMLMediaElement.prototype.play)
    const pauseSpy = vi.mocked(window.HTMLMediaElement.prototype.pause)

    render(<RemotionCourseWorkbench />)
    playSpy.mockClear()
    pauseSpy.mockClear()

    await user.click(screen.getByRole('button', { name: '播放' }))

    await waitFor(() => expect(playSpy.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '60' } })

    expect((screen.getByTestId('background-preview-video') as HTMLVideoElement).currentTime).toBe(2)
    expect((screen.getByTestId('foreground-preview-video') as HTMLVideoElement).currentTime).toBe(2)

    await user.click(screen.getByRole('button', { name: '暂停' }))

    await waitFor(() => expect(pauseSpy).toHaveBeenCalledTimes(2))
  })

  it('falls back to the mock slide when no local preview url is available', () => {
    const state = createDefaultCourseWorkbenchState()
    const fallbackStage = {
      ...state.stage,
      backgroundSource: {
        ...state.stage.backgroundSource,
        previewMode: 'mock' as const,
        localPreviewUrl: undefined,
      },
      foregroundSource: {
        ...state.stage.foregroundSource,
        localPreviewUrl: undefined,
      },
    }

    render(
      <CoursePreviewStage
        action={state.actions.find((action) => action.id === state.selectedActionId) ?? state.actions[0]}
        segment={state.timeline[0]}
        stage={fallbackStage}
        playback={state.playback}
        timeline={state.timeline}
        actions={state.actions}
        selectedElementId={state.selectedElementId}
        fps={state.project.fps}
        dispatch={() => undefined}
      />,
    )

    expect(screen.queryByTestId('background-preview-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('foreground-preview-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('preview-canvas')).toHaveTextContent('首屏标题：Codex 实战')
    expect(screen.getByTestId('preview-canvas')).toHaveTextContent(
      '玩转 AI · Codex 实战：12 张分镜图怎么做成视频？',
    )
    expect(screen.getByTestId('preview-canvas')).toHaveTextContent('local preview source unavailable')
  })

  it('plays, pauses, seeks, selects an element, and binds the current action to it', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '播放' }))
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '918' } })
    expect(screen.getByText(/当前章节：工具边界与实现演示/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /代码示例区域/ }))
    expect(screen.getAllByText('已选元素：代码示例区域')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: '绑定动作到元素' }))
    expect(screen.getByTestId('action-time-ruler')).toBeInTheDocument()
    expect(screen.getByTestId('action-time-ruler')).toHaveTextContent('circle-mark → 代码示例区域')
  })

  it('binds the red circle callout to the real case title element', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /视频标题/ }))
    expect(screen.getAllByText('已选元素：视频标题')).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: /红色圈注/ }).at(-1)!)
    await user.click(screen.getByRole('button', { name: '绑定动作到元素' }))

    expect(screen.getByTestId('action-time-ruler')).toHaveTextContent('circle-mark → 视频标题')
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })
    const circleOverlay = container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')
    expect(circleOverlay).toHaveClass('preview-action--circle')
    expect(circleOverlay).toHaveTextContent('圈出标题')
  })

  it('selects a stage element box in the real browser click path and reveals the binder', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    const titleBox = Array.from(container.querySelectorAll('.stage-element-box')).find(
      (element) => element.textContent === '视频标题',
    )

    expect(titleBox).toHaveAttribute('aria-pressed', 'false')

    await user.click(titleBox as HTMLElement)

    expect(titleBox).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('已选元素：视频标题')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '绑定动作到元素' })).toBeInTheDocument()
  })

  it('shows animation bindings for the selected DOM in Element Inspector', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /视频标题/ }))

    const inspector = screen.getByTestId('element-inspector')
    expect(inspector).toHaveTextContent('DOM 绑定动画')
    expect(inspector).toHaveTextContent('已绑定动画')
    expect(inspector).toHaveTextContent('circle-mark')
    expect(inspector).toHaveTextContent('红色圈注')
    expect(inspector).toHaveTextContent('18f - 168f')
    expect(inspector).toHaveTextContent('150f')
    expect(inspector).toHaveTextContent('fadeIn 8f')
    expect(inspector).toHaveTextContent('fadeOut 10f')
  })

  it('shows an empty DOM binding state and add-binding controls for an unbound DOM', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: '玩转 AI · Codex 实战' }))

    const inspector = screen.getByTestId('element-inspector')
    expect(inspector).toHaveTextContent('已选元素：玩转 AI · Codex 实战')
    expect(inspector).toHaveTextContent('尚未绑定动画')
    expect(within(inspector).getByLabelText('绑定动作')).toBeInTheDocument()
    expect(within(inspector).getByRole('button', { name: '绑定动作到元素' })).toBeInTheDocument()
  })

  it('adds a new binding from Element Inspector and mirrors it to the global action ruler', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: '玩转 AI · Codex 实战' }))
    await user.selectOptions(within(screen.getByTestId('element-inspector')).getByLabelText('绑定动作'), 'highlight-box')
    await user.click(within(screen.getByTestId('element-inspector')).getByRole('button', { name: '绑定动作到元素' }))

    const inspector = screen.getByTestId('element-inspector')
    expect(inspector).toHaveTextContent('已绑定动画')
    expect(inspector).toHaveTextContent('highlight-box')
    expect(inspector).toHaveTextContent('蓝色定义高亮框')
    expect(screen.getByTestId('action-time-ruler')).toHaveTextContent('highlight-box → 玩转 AI · Codex 实战')
  })

  it('edits the selected DOM binding timing and params from Element Inspector', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /视频标题/ }))
    const inspector = screen.getByTestId('element-inspector')

    await user.clear(within(inspector).getByLabelText('绑定起点'))
    await user.type(within(inspector).getByLabelText('绑定起点'), '30')
    await user.clear(within(inspector).getByLabelText('绑定时长'))
    await user.type(within(inspector).getByLabelText('绑定时长'), '120')
    await user.clear(within(inspector).getByLabelText('淡入帧'))
    await user.type(within(inspector).getByLabelText('淡入帧'), '6')
    await user.clear(within(inspector).getByLabelText('淡出帧'))
    await user.type(within(inspector).getByLabelText('淡出帧'), '9')
    fireEvent.change(within(inspector).getByLabelText('绑定颜色'), { target: { value: '#22c55e' } })
    await user.clear(within(inspector).getByLabelText('绑定标签'))
    await user.type(within(inspector).getByLabelText('绑定标签'), '标题红圈')

    expect(inspector).toHaveTextContent('30f - 150f')
    expect(inspector).toHaveTextContent('120f')
    expect(inspector).toHaveTextContent('fadeIn 6f')
    expect(inspector).toHaveTextContent('fadeOut 9f')
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '40' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveTextContent('标题红圈')
    expect(screen.getByTestId('action-time-ruler')).toHaveTextContent('circle-mark → 视频标题')
  })

  it('removes the selected DOM binding from Element Inspector and the global ruler', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /视频标题/ }))
    await user.click(within(screen.getByTestId('element-inspector')).getByRole('button', { name: '移除绑定' }))

    const inspector = screen.getByTestId('element-inspector')
    expect(inspector).toHaveTextContent('尚未绑定动画')
    expect(screen.queryByTestId('element-binding-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('action-time-ruler')).not.toHaveTextContent('circle-mark → 视频标题')
  })

  it('keeps DOM bindings separate from the global Action Library Manager', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /视频标题/ }))

    expect(screen.getByTestId('element-inspector')).toHaveTextContent('DOM 绑定动画')
    expect(screen.getByRole('heading', { level: 2, name: /Action Library Manager/ })).toBeInTheDocument()
    expect(screen.getByTestId('element-inspector')).not.toContainElement(
      screen.getByRole('heading', { level: 2, name: /Action Library Manager/ }),
    )
  })

  it('drags and resizes the foreground speaker window inside the review canvas', () => {
    render(<RemotionCourseWorkbench />)

    const foreground = screen.getByTestId('foreground-window-preview')
    fireEvent.pointerDown(foreground, { clientX: 800, clientY: 1200 })
    fireEvent.pointerMove(foreground, { clientX: 850, clientY: 1250 })
    fireEvent.pointerUp(foreground)

    expect(foreground).toHaveStyle({
      left: '70%',
      top: '60%',
    })

    const resizeHandle = screen.getByTestId('foreground-resize-handle')
    expect(window.getComputedStyle(resizeHandle).pointerEvents).toBe('auto')
    expect(window.getComputedStyle(resizeHandle).width).toBe('24px')
    expect(window.getComputedStyle(resizeHandle).height).toBe('24px')
    fireEvent.pointerDown(resizeHandle, { clientX: 900, clientY: 1300 })
    fireEvent.pointerMove(resizeHandle, { clientX: 950, clientY: 1360 })
    fireEvent.pointerUp(resizeHandle)

    expect(foreground).toHaveStyle({
      width: '27%',
      height: '24%',
    })
  })

  it('drags and resizes the selected action overlay inside the review canvas', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    await user.click(screen.getAllByRole('button', { name: /红色圈注/ }).at(-1)!)
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })

    const overlay = container.querySelector('[data-action-ref-id="ref-title-circle-mark"]') as HTMLElement
    const moveHandle = within(overlay).getByTestId('action-move-handle')
    expect(window.getComputedStyle(moveHandle).pointerEvents).toBe('auto')
    expect(window.getComputedStyle(moveHandle).width).toBe('24px')
    expect(window.getComputedStyle(moveHandle).height).toBe('24px')
    fireEvent.pointerDown(moveHandle, { clientX: 260, clientY: 380 })
    fireEvent.pointerMove(moveHandle, { clientX: 310, clientY: 430 })
    fireEvent.pointerUp(moveHandle)

    expect(screen.getByLabelText('X')).toHaveValue(22)
    expect(screen.getByLabelText('Y')).toHaveValue(31)

    const resizeHandle = within(overlay).getByTestId('action-resize-handle')
    expect(window.getComputedStyle(resizeHandle).pointerEvents).toBe('auto')
    expect(window.getComputedStyle(resizeHandle).width).toBe('24px')
    expect(window.getComputedStyle(resizeHandle).height).toBe('24px')
    fireEvent.pointerDown(resizeHandle, { clientX: 520, clientY: 500 })
    fireEvent.pointerMove(resizeHandle, { clientX: 580, clientY: 540 })
    fireEvent.pointerUp(resizeHandle)

    expect(screen.getByLabelText('宽度')).toHaveValue(64)
    expect(screen.getByLabelText('高度')).toHaveValue(22)
    expect(overlay).toHaveStyle({
      width: '64%',
      height: '22%',
    })
  })

  it('renders a production workbench with timeline, assets, library, preview, and Codex handoff', () => {
    render(<RemotionCourseWorkbench />)

    expect(screen.getByRole('heading', { level: 1, name: /Studio Console/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Media Intake/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Timeline/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Action Library Manager/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Inspector' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Review 预览/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Assembly Manifest/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /CapCut Handoff/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Local Codex/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /打开动作库子页面/ })).toHaveAttribute(
      'href',
      '/topics/remotion-course/actions',
    )
    expect(screen.getAllByRole('button', { name: /红色圈注/ }).at(-1)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('keeps the review stage before the action library in the main work area', () => {
    render(<RemotionCourseWorkbench />)

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings.indexOf('Review 预览')).toBeLessThan(headings.indexOf('Action Library Manager'))
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
    const { container } = render(<RemotionCourseWorkbench />)

    await user.clear(screen.getByLabelText('动作名称'))
    await user.type(screen.getByLabelText('动作名称'), '核心定义高亮')
    await user.clear(screen.getByLabelText('标签'))
    await user.type(screen.getByLabelText('标签'), '结构化输入')
    fireEvent.change(screen.getByLabelText('边框颜色'), { target: { value: '#d97706' } })

    expect(screen.getByRole('button', { name: /核心定义高亮/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })
    expect(container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')).toHaveTextContent('结构化输入')
    expect(screen.getByLabelText('边框颜色')).toHaveAttribute('type', 'color')
    expect(screen.getByLabelText('边框颜色')).toHaveValue('#d97706')
  })

  it('edits overlay radius and background styling from action params', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })

    await user.clear(screen.getByLabelText('边框圆角'))
    await user.type(screen.getByLabelText('边框圆角'), '22')
    fireEvent.change(screen.getByLabelText('背景颜色'), { target: { value: '#fef3c7' } })
    await user.clear(screen.getByLabelText('背景透明度'))
    await user.type(screen.getByLabelText('背景透明度'), '0.35')

    const circleOverlay = container.querySelector('[data-action-ref-id="ref-title-circle-mark"]')
    expect(circleOverlay).toHaveStyle({
      borderRadius: '22px',
      backgroundColor: 'rgba(254, 243, 199, 0.35)',
    })
  })

  it('marks editor-only handles and selection boxes so they are excluded from export output', () => {
    const { container } = render(<RemotionCourseWorkbench />)
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '30' } })

    for (const editorElement of container.querySelectorAll(
      '.stage-element-box, .action-move-handle, .resize-handle',
    )) {
      expect(editorElement).toHaveAttribute('data-editor-only', 'true')
      expect(editorElement).toHaveClass('editor-only')
    }
  })

  it('hides editor-only controls in export preview mode while keeping active overlays', () => {
    const state = createDefaultCourseWorkbenchState()

    render(
      <CoursePreviewStage
        action={state.actions.find((action) => action.id === state.selectedActionId) ?? state.actions[0]}
        segment={state.timeline[0]}
        stage={state.stage}
        playback={{ ...state.playback, currentFrame: 30 }}
        timeline={state.timeline}
        actions={state.actions}
        selectedElementId={state.selectedElementId}
        fps={state.project.fps}
        mode="export"
        dispatch={() => undefined}
      />,
    )

    expect(screen.getByTestId('preview-action')).toHaveClass('preview-action--circle')
    expect(screen.queryByRole('button', { name: /视频标题/ })).not.toBeInTheDocument()
    expect(screen.queryByTestId('action-move-handle')).not.toBeInTheDocument()
    expect(screen.queryByTestId('action-resize-handle')).not.toBeInTheDocument()
    expect(screen.queryByTestId('foreground-resize-handle')).not.toBeInTheDocument()
  })

  it('shows an animated action review instead of a static placeholder', async () => {
    const user = userEvent.setup()
    const { container } = render(<RemotionCourseWorkbench />)

    expect(screen.getByText('进场 · 强调 · 退场')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重播动作/ })).toBeInTheDocument()
    expect(screen.getByTestId('preview-action')).toHaveAttribute(
      'data-animation-phase',
      'emphasis',
    )

    await user.click(screen.getByRole('button', { name: /光标点击提示/ }))
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '920' } })

    expect(screen.getByTestId('preview-action')).toHaveClass('preview-action--cursor')
    expect(screen.getByTestId('preview-action')).toHaveTextContent('点击')

    await user.click(screen.getAllByRole('button', { name: /代码行高亮/ }).at(-1)!)
    fireEvent.change(screen.getByLabelText('播放头'), { target: { value: '950' } })

    const codeOverlay = container.querySelector('[data-action-ref-id="ref-code-highlight"]')
    expect(codeOverlay).toHaveClass('preview-action--code')
    expect(codeOverlay).toHaveTextContent('line 6')
  })

  it('duplicates and deletes the selected action', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.click(screen.getByRole('button', { name: /复制动作/ }))
    const duplicated = screen.getByRole('button', { name: /红色圈注 副本/ })
    expect(duplicated).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /删除动作/ }))
    expect(screen.queryByRole('button', { name: /红色圈注 副本/ })).not.toBeInTheDocument()
  })

  it('adjusts the foreground speaker window without becoming a full video editor', async () => {
    const user = userEvent.setup()
    render(<RemotionCourseWorkbench />)

    await user.clear(screen.getByLabelText('前台 X'))
    await user.type(screen.getByLabelText('前台 X'), '62')
    await user.clear(screen.getByLabelText('前台宽度'))
    await user.type(screen.getByLabelText('前台宽度'), '24')
    await user.selectOptions(screen.getByLabelText('前台形状'), 'circle')

    expect(screen.getByTestId('foreground-window-preview')).toHaveAttribute('data-shape', 'circle')
    expect(screen.getByTestId('foreground-window-preview')).toHaveStyle({
      left: '62%',
      width: '24%',
    })
    expect(screen.queryByRole('button', { name: /split/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ripple delete/i })).not.toBeInTheDocument()
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

  it('shows assembly-state exports and CapCut handoff files', () => {
    render(<RemotionCourseWorkbench />)

    expect(screen.getByTestId('assembly-manifest-output')).toHaveTextContent('course-assembly/inputs.json')
    expect(screen.getByTestId('assembly-manifest-output')).toHaveTextContent('course-assembly/element-map.json')
    expect(screen.getByTestId('assembly-manifest-output')).toHaveTextContent('course-assembly/foreground-window.json')
    expect(screen.getByTestId('assembly-manifest-output')).toHaveTextContent('assembly-only')
    expect(screen.queryByText(/source of truth/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('master-preview.mp4')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('background-clean.mp4')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('foreground-speaker.mp4')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('editor-only controls are excluded')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('overlays/001-circle-mark-alpha.webm')
    expect(screen.getByTestId('capcut-package-output')).not.toHaveTextContent('overlays/002-lower-third-alpha.webm')
    expect(screen.getByTestId('capcut-package-output')).not.toHaveTextContent('overlays/008-code-line-highlight-alpha.webm')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('"overlayCount": 1')
    expect(screen.getByTestId('capcut-package-output')).toHaveTextContent('edit-guide.md')
  })
})
