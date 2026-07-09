import { describe, expect, it } from 'vitest'
import { demoAnimationActions } from './animationLibraryModel'
import { createDefaultCourseWorkbenchState } from './courseWorkbenchData'
import {
  buildCapCutHandoffPackage,
  buildCodexHandoffRequest,
  buildCourseProjectPackage,
  courseWorkbenchReducer,
} from './courseWorkbenchReducer'

describe('courseWorkbenchReducer', () => {
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
    expect(state.actions).toHaveLength(13)
    expect(state.selectedActionId).toBe('highlight-box')
    expect(state.selectedSegmentId).toBe('seg-intro')
    expect(state.timeline[0].actionRefs[0]).toMatchObject({ actionId: 'lower-third' })
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

    expect(moved.actions.find((action) => action.id === 'highlight-box')?.params).toMatchObject({
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
        id: 'highlight-box',
        category: 'highlight',
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

  it('builds a project package as the primary source of truth', () => {
    const state = createDefaultCourseWorkbenchState()
    const projectPackage = buildCourseProjectPackage(state)

    expect(projectPackage.root).toBe('course-project/')
    expect(projectPackage.files.map((file) => file.path)).toEqual([
      'course-project/project.json',
      'course-project/assets.json',
      'course-project/timeline.json',
      'course-project/actions/highlight-box.json',
      'course-project/actions/arrow-callout.json',
      'course-project/actions/circle-mark.json',
      'course-project/actions/text-card.json',
      'course-project/actions/lower-third.json',
      'course-project/actions/slide-zoom.json',
      'course-project/actions/course-progress.json',
      'course-project/actions/step-reveal.json',
      'course-project/actions/cursor-click.json',
      'course-project/actions/code-line-highlight.json',
      'course-project/actions/before-after-wipe.json',
      'course-project/actions/spotlight-mask.json',
      'course-project/actions/chapter-transition.json',
      'course-project/exports/manifest.json',
    ])
    expect(projectPackage.manifest.primarySource).toBe('project-files')
    expect(projectPackage.manifest.renderTargets).toEqual(['remotion', 'hyperframes', 'ffmpeg'])
    expect(projectPackage.manifest.capcutHandoff).toBe('course-project/exports/capcut-handoff/manifest.json')
  })

  it('builds a CapCut handoff package from the project package', () => {
    const state = createDefaultCourseWorkbenchState()
    const capcutPackage = buildCapCutHandoffPackage(state)

    expect(capcutPackage.root).toBe('course-project/exports/capcut-handoff/')
    expect(capcutPackage.files.map((file) => file.path)).toEqual([
      'course-project/exports/capcut-handoff/master-preview.mp4',
      'course-project/exports/capcut-handoff/clean-ppt-video.mp4',
      'course-project/exports/capcut-handoff/speaker-pip.mp4',
      'course-project/exports/capcut-handoff/overlays/001-lower-third-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/002-highlight-box-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/003-course-progress-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/004-arrow-callout-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/005-text-card-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/006-spotlight-mask-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/007-cursor-click-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/008-code-line-highlight-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/009-step-reveal-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/010-before-after-wipe-alpha.webm',
      'course-project/exports/capcut-handoff/overlays/011-chapter-transition-alpha.webm',
      'course-project/exports/capcut-handoff/captions.srt',
      'course-project/exports/capcut-handoff/captions.txt',
      'course-project/exports/capcut-handoff/timeline.csv',
      'course-project/exports/capcut-handoff/edit-guide.md',
      'course-project/exports/capcut-handoff/manifest.json',
    ])
    expect(capcutPackage.guide).toContain('剪映/CapCut 导入顺序')
    expect(capcutPackage.manifest.tracks).toEqual(['master', 'clean-ppt', 'speaker-pip', 'overlays', 'captions'])
    expect(capcutPackage.manifest.overlayCount).toBe(11)
  })
})
