import { describe, expect, it } from 'vitest'
import { demoAnimationActions } from './animationLibraryModel'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import {
  buildCapCutHandoffPackage,
  buildCourseAssemblyManifest,
  buildCodexHandoffRequest,
  courseWorkbenchReducer,
} from './courseWorkbenchReducer'

describe('courseWorkbenchReducer', () => {
  it('initializes a HyperFrames project folder as the structured background source', () => {
    const state = createDefaultCourseWorkbenchState()

    expect(state.stage.backgroundSource.sourceKind).toBe('hyperframes-project')
    expect(state.stage.backgroundSource.name).toContain('HyperFrames')
    expect(state.stage.backgroundSource.projectPath).toContain('codex-keyframes-tutorial')
    expect(state.stage.backgroundSource.renderedPreview).toContain('codex-keyframes-tutorial.mp4')
    expect(state.stage.backgroundSource.audioPolicy).toBe('muted')
    expect(state.stage.foregroundSource.audioPolicy).toBe('primary')
    expect(state.stage.foregroundSource.name).toContain('codex-keyframes-tutorial.mp4')
  })

  it('loads the Codex Keyframes Tutorial preset as a vertical 158 second assembly case', () => {
    const state = createDefaultCourseWorkbenchState()

    expect(state.project.title).toBe('Codex Keyframes Tutorial')
    expect(state.project.aspectRatio).toBe('9:16')
    expect(state.stage.canvasAspectRatio).toBe('9:16')
    expect(state.playback.totalFrames).toBe(4740)
    expect(state.stage.backgroundSource.projectPath).toBe(
      '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial',
    )
    expect(state.stage.backgroundSource.entryHtml).toContain('index.html')
    expect(state.stage.backgroundSource.designFile).toContain('DESIGN.md')
    expect(state.stage.backgroundSource.renderedPreview).toBe(
      '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial/renders/codex-keyframes-tutorial.mp4',
    )
    expect(state.stage.backgroundSource.sourceAspectRatio).toBe('9:16')
    expect(state.stage.elements.find((element) => element.id === 'element-video-title')).toMatchObject({
      label: '视频标题',
      selector: '#s1 h1',
      compositionId: 's1',
      frameRange: [0, 210],
    })
    expect(state.actions.find((action) => action.id === 'circle-mark')).toMatchObject({
      category: 'circle',
      params: {
        color: '#ef4444',
        label: '圈出标题',
      },
    })
    expect(state.stage.foregroundSource.durationFrames).toBe(4740)
  })

  it('changes canvas aspect ratio while keeping the workbench route public-safe', () => {
    const state = createDefaultCourseWorkbenchState()

    const fourByThree = courseWorkbenchReducer(state, {
      type: 'set-aspect-ratio',
      aspectRatio: '4:3',
    })
    const portrait = courseWorkbenchReducer(fourByThree, {
      type: 'set-aspect-ratio',
      aspectRatio: '9:16',
    })

    expect(fourByThree.project.aspectRatio).toBe('4:3')
    expect(fourByThree.stage.canvasAspectRatio).toBe('4:3')
    expect(portrait.project.aspectRatio).toBe('9:16')
    expect(portrait.stage.canvasAspectRatio).toBe('9:16')
  })

  it('seeks by frame and synchronizes the selected segment', () => {
    const state = createDefaultCourseWorkbenchState()

    const inCodeDemo = courseWorkbenchReducer(state, { type: 'seek-frame', frame: 918 })
    const afterEnd = courseWorkbenchReducer(inCodeDemo, { type: 'seek-frame', frame: 9999 })

    expect(inCodeDemo.playback.currentFrame).toBe(918)
    expect(inCodeDemo.selectedSegmentId).toBe('seg-code-demo')
    expect(afterEnd.playback.currentFrame).toBe(afterEnd.playback.totalFrames)
    expect(afterEnd.selectedSegmentId).toBe('seg-wrap')
  })

  it('selects a HyperFrames element and binds the selected action to it', () => {
    const state = createDefaultCourseWorkbenchState()

    const selectedElement = courseWorkbenchReducer(state, {
      type: 'select-stage-element',
      id: 'element-code-sample',
    })
    const bound = courseWorkbenchReducer(selectedElement, {
      type: 'bind-selected-action-to-element',
      from: 54,
      duration: 72,
    })

    expect(selectedElement.selectedElementId).toBe('element-code-sample')
    expect(selectedElement.stage.elements.find((element) => element.id === 'element-code-sample')).toMatchObject({
      source: 'hyperframes',
      label: '代码示例区域',
      selector: '#scene-03-code-block',
    })
    expect(bound.timeline.find((segment) => segment.id === 'seg-code-demo')?.actionRefs).toContainEqual(
      expect.objectContaining({
        actionId: 'circle-mark',
        elementId: 'element-code-sample',
        from: 54,
        duration: 72,
        exportRole: 'platform-overlay',
        exportableOverlay: true,
      }),
    )
  })

  it('updates the foreground speaker window without changing media timing rules', () => {
    const state = createDefaultCourseWorkbenchState()

    const updated = courseWorkbenchReducer(state, {
      type: 'set-foreground-window',
      patch: {
        x: 62,
        y: 58,
        width: 24,
        height: 26,
        shape: 'circle',
      },
    })

    expect(updated.stage.foregroundWindow).toMatchObject({
      x: 62,
      y: 58,
      width: 24,
      height: 26,
      shape: 'circle',
    })
    expect(updated.stage.foregroundSource.audioPolicy).toBe('primary')
    expect(updated.playback.totalFrames).toBe(4740)
  })

  it('resizes the selected action overlay for title callouts', () => {
    const state = createDefaultCourseWorkbenchState()
    const selectedCircle = courseWorkbenchReducer(state, { type: 'select-action', id: 'circle-mark' })
    const resized = courseWorkbenchReducer(selectedCircle, {
      type: 'resize-selected-action',
      width: 62,
      height: 18,
      radius: 18,
    })

    expect(resized.actions.find((action) => action.id === 'circle-mark')?.params).toMatchObject({
      width: 62,
      height: 18,
      radius: 18,
    })
  })

  it('imports detected HyperFrames animations and creates draft actions for missing mappings', () => {
    const state = createDefaultCourseWorkbenchState()

    expect(state.detectedHyperframesAnimations.length).toBeGreaterThanOrEqual(1)
    expect(state.detectedHyperframesAnimations[0]).toMatchObject({
      selector: expect.any(String),
      actionSignature: expect.any(String),
      suggestedActionId: expect.any(String),
    })
    expect(state.actions.find((action) => action.id === 'marker-sweep')).toMatchObject({
      status: 'draft',
      implementation: {
        mode: 'custom-component',
      },
    })
  })

  it('starts with reusable teaching actions and a selected timeline segment', () => {
    const state = createDefaultCourseWorkbenchState()

    expect(demoAnimationActions.map((action) => action.category)).toEqual([
      'highlight',
      'arrow',
      'circle',
      'text-card',
      'lower-third',
      'zoom',
      'progress',
      'step-reveal',
      'cursor',
      'code',
      'comparison',
      'spotlight',
      'transition',
    ])
    expect(state.actions).toHaveLength(14)
    expect(state.selectedActionId).toBe('circle-mark')
    expect(state.selectedSegmentId).toBe('seg-intro')
    expect(state.timeline[0].actionRefs[0]).toMatchObject({
      actionId: 'circle-mark',
      elementId: 'element-video-title',
    })
    expect(state.actions.find((action) => action.id === 'slide-zoom')).toMatchObject({
      implementation: {
        mode: 'llm-assisted',
      },
    })
    expect(state.actions.find((action) => action.id === 'slide-zoom')?.implementation.intent).toContain(
      '根据讲解重点识别需要放大的 PPT 区域',
    )
  })

  it('includes common course-production actions for public mock and local authoring', () => {
    const state = createDefaultCourseWorkbenchState()

    expect(state.actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'course-progress',
        'step-reveal',
        'cursor-click',
        'code-line-highlight',
        'before-after-wipe',
        'spotlight-mask',
        'chapter-transition',
        'marker-sweep',
      ]),
    )
    expect(state.actions.find((action) => action.id === 'before-after-wipe')?.implementation.mode).toBe(
      'llm-assisted',
    )
    expect(state.actions.find((action) => action.id === 'step-reveal')?.implementation.mode).toBe(
      'custom-component',
    )
    expect(state.timeline).toHaveLength(4)
    expect(state.assets.filter((asset) => asset.type === 'slide')).toHaveLength(4)
  })

  it('creates and updates an action while keeping it selected', () => {
    const state = createDefaultCourseWorkbenchState()
    const created = courseWorkbenchReducer(state, {
      type: 'create-action',
      category: 'highlight',
    })
    const newAction = created.actions.at(-1)!

    expect(newAction).toMatchObject({
      category: 'highlight',
      status: 'draft',
      name: '新建高亮框动作',
    })
    expect(created.selectedActionId).toBe(newAction.id)

    const updated = courseWorkbenchReducer(created, {
      type: 'update-action',
      id: newAction.id,
      patch: {
        name: '概念定义高亮',
        status: 'ready',
        params: {
          label: '核心定义',
          color: '#2563eb',
          x: 22,
          y: 30,
          width: 48,
          height: 18,
        },
      },
    })

    expect(updated.actions.find((action) => action.id === newAction.id)).toMatchObject({
      name: '概念定义高亮',
      status: 'ready',
      params: {
        label: '核心定义',
        color: '#2563eb',
        x: 22,
        y: 30,
        width: 48,
        height: 18,
      },
    })
  })

  it('duplicates and deletes actions without leaving stale timeline refs', () => {
    const state = createDefaultCourseWorkbenchState()
    const duplicated = courseWorkbenchReducer(state, {
      type: 'duplicate-action',
      id: 'highlight-box',
    })
    const copy = duplicated.actions.at(-1)!

    expect(copy.id).not.toBe('highlight-box')
    expect(copy.name).toContain('副本')
    expect(copy.status).toBe('draft')
    expect(duplicated.selectedActionId).toBe(copy.id)

    const deleted = courseWorkbenchReducer(duplicated, {
      type: 'delete-action',
      id: 'highlight-box',
    })

    expect(deleted.actions.some((action) => action.id === 'highlight-box')).toBe(false)
    expect(
      deleted.timeline.flatMap((segment) => segment.actionRefs).some((ref) => ref.actionId === 'highlight-box'),
    ).toBe(false)
    expect(deleted.selectedActionId).toBe(copy.id)
  })

  it('moves selected preview annotations by updating action coordinates', () => {
    const state = createDefaultCourseWorkbenchState()
    const moved = courseWorkbenchReducer(state, {
      type: 'move-selected-action',
      x: 34,
      y: 42,
    })

    expect(moved.actions.find((action) => action.id === 'circle-mark')?.params).toMatchObject({
      x: 34,
      y: 42,
    })
  })

  it('generates a local Codex handoff request from the selected review context', () => {
    const state = createDefaultCourseWorkbenchState()
    const withReview = courseWorkbenchReducer(state, {
      type: 'set-review-note',
      note: '把高亮框移动到第二个流程节点，并把颜色改成警示橙。',
    })
    const request = buildCodexHandoffRequest(withReview)
    const generated = courseWorkbenchReducer(withReview, { type: 'generate-handoff' })

    expect(request).toMatchObject({
      environment: 'local-only',
      projectPath: '/Volumes/2TB-NVMe/work/ai-website',
      action: {
        id: 'circle-mark',
        category: 'circle',
      },
      segment: {
        id: 'seg-intro',
        slide: 1,
      },
      reviewNote: '把高亮框移动到第二个流程节点，并把颜色改成警示橙。',
    })
    expect(request.prompt).toContain('请基于当前课程动画动作库修改这个 animation action')
    expect(request.prompt).toContain('实现模式')
    expect(generated.handoffRequests[0]).toEqual(request)
  })

  it('builds a lightweight course assembly manifest for workbench state only', () => {
    const state = createDefaultCourseWorkbenchState()
    const assemblyManifest = buildCourseAssemblyManifest(state)

    expect(assemblyManifest.root).toBe('course-assembly/')
    expect(assemblyManifest.files.map((file) => file.path)).toEqual([
      'course-assembly/inputs.json',
      'course-assembly/element-map.json',
      'course-assembly/actions.json',
      'course-assembly/timeline.json',
      'course-assembly/foreground-window.json',
      'course-assembly/handoff/codex-handoff.json',
      'course-assembly/handoff/capcut-manifest.json',
    ])
    expect(assemblyManifest.manifest.scope).toBe('assembly-only')
    expect(assemblyManifest.manifest.includes).toEqual([
      'inputs',
      'element-map',
      'actions',
      'timeline',
      'foreground-window',
      'handoff',
    ])
    expect(assemblyManifest.manifest.capcutHandoff).toBe('course-assembly/handoff/capcut-manifest.json')
  })

  it('builds a CapCut handoff package with only user-bound platform overlays', () => {
    const state = createDefaultCourseWorkbenchState()
    const capcutPackage = buildCapCutHandoffPackage(state)

    expect(capcutPackage.root).toBe('course-assembly/handoff/capcut/')
    expect(capcutPackage.files.map((file) => file.path)).toEqual([
      'course-assembly/handoff/capcut/master-preview.mp4',
      'course-assembly/handoff/capcut/background-clean.mp4',
      'course-assembly/handoff/capcut/foreground-speaker.mp4',
      'course-assembly/handoff/capcut/overlays/001-circle-mark-alpha.webm',
      'course-assembly/handoff/capcut/captions.srt',
      'course-assembly/handoff/capcut/timeline.csv',
      'course-assembly/handoff/capcut/edit-guide.md',
      'course-assembly/handoff/capcut/manifest.json',
    ])
    expect(capcutPackage.guide).toContain('剪映/CapCut 导入顺序')
    expect(capcutPackage.guide).toContain('background-clean 已包含 HyperFrames 内部动画')
    expect(capcutPackage.guide).toContain('overlays 只包含平台新增标注')
    expect(capcutPackage.guide).toContain('editor-only controls are excluded')
    expect(capcutPackage.manifest.tracks).toEqual(['master', 'background', 'foreground', 'overlays', 'captions'])
    expect(capcutPackage.manifest.overlayCount).toBe(1)
  })

  it('does not export HyperFrames detected or background-only action refs as overlay files', () => {
    const state = createDefaultCourseWorkbenchState()
    const withInternalHyperframesRef = {
      ...state,
      timeline: state.timeline.map((segment) =>
        segment.id === 'seg-concept'
          ? {
              ...segment,
              actionRefs: [
                ...segment.actionRefs,
                {
                  id: 'ref-hf-marker-sweep-internal',
                  actionId: 'marker-sweep',
                  elementId: 'element-flow-node',
                  from: 0,
                  duration: 64,
                  exportRole: 'hyperframes-internal' as const,
                  renderedInBackground: true,
                  exportableOverlay: false,
                },
              ],
            }
          : segment,
      ),
    }

    const capcutPackage = buildCapCutHandoffPackage(withInternalHyperframesRef)
    const overlayPaths = capcutPackage.files.map((file) => file.path).filter((path) => path.includes('/overlays/'))

    expect(overlayPaths).toEqual(['course-assembly/handoff/capcut/overlays/001-circle-mark-alpha.webm'])
    expect(JSON.stringify(capcutPackage)).not.toContain('marker-sweep-alpha.webm')
  })
})
