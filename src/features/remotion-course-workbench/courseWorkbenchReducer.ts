import { createNewAnimationAction } from './animationLibraryModel'
import type {
  AnimationAction,
  CapCutHandoffPackage,
  CodexHandoffRequest,
  CourseAssemblyManifest,
  CoursePackageFile,
  CourseWorkbenchAction,
  CourseWorkbenchState,
  TimelineSegment,
} from './workbenchTypes'

const localProjectPath = '/Volumes/2TB-NVMe/work/ai-website'

function cloneAction(action: AnimationAction): AnimationAction {
  return {
    ...action,
    params: { ...action.params },
    presets: action.presets.map((preset) => ({
      ...preset,
      params: { ...preset.params },
    })),
  }
}

function cloneSegment(segment: TimelineSegment): TimelineSegment {
  return {
    ...segment,
    actionRefs: segment.actionRefs.map((ref) => ({
      ...ref,
      params: ref.params ? { ...ref.params } : undefined,
    })),
  }
}

function getSelectedAction(state: CourseWorkbenchState) {
  return state.actions.find((action) => action.id === state.selectedActionId) ?? state.actions[0]
}

function getSelectedSegment(state: CourseWorkbenchState) {
  return state.timeline.find((segment) => segment.id === state.selectedSegmentId) ?? state.timeline[0]
}

function findSegmentAtFrame(state: CourseWorkbenchState, frame: number) {
  return (
    state.timeline.find((segment) => frame >= segment.from && frame < segment.from + segment.duration)
    ?? state.timeline.at(-1)
    ?? state.timeline[0]
  )
}

function findActionRefsForElement(state: CourseWorkbenchState, elementId: string) {
  return state.timeline.flatMap((segment) =>
    segment.actionRefs
      .map((ref, index) => ({ segment, ref, index }))
      .filter(({ ref }) => ref.elementId === elementId),
  )
}

function clampFrame(frame: number, totalFrames: number) {
  return Math.min(Math.max(Math.round(frame), 0), totalFrames)
}

function nextCustomActionIndex(actions: AnimationAction[]) {
  return actions.filter((action) => action.id.startsWith('custom-')).length + 1
}

export function buildCodexHandoffRequest(state: CourseWorkbenchState): CodexHandoffRequest {
  const action = cloneAction(getSelectedAction(state))
  const segment = cloneSegment(getSelectedSegment(state))
  const reviewNote = state.reviewNote.trim() || '请优化当前动画动作，使其更适合课程讲解节奏。'

  return {
    id: `handoff-${action.id}-${segment.id}-${state.handoffRequests.length + 1}`,
    environment: 'local-only',
    projectPath: localProjectPath,
    createdAt: '2026-07-09T00:00:00.000Z',
    action,
    segment,
    reviewNote,
    prompt: [
      '请基于当前课程动画动作库修改这个 animation action。',
      `项目路径：${localProjectPath}`,
      `动作：${action.name} (${action.id})`,
      `实现模式：${action.implementation.mode}`,
      `动作意图：${action.implementation.intent}`,
      `组件契约：${action.implementation.componentContract}`,
      `时间轴片段：${segment.title} (${segment.id})`,
      `Review 意见：${reviewNote}`,
      '如果是 parametric 动作，请优先返回可直接写回 action params 或 preset 的 JSON patch。',
      '如果是 llm-assisted 或 custom-component 动作，请返回 action schema、组件契约、预览 fixture 和导出文件计划。',
    ].join('\n'),
  }
}

export function buildCourseAssemblyManifest(state: CourseWorkbenchState): CourseAssemblyManifest {
  return {
    root: 'course-assembly/',
    files: [
      {
        path: 'course-assembly/inputs.json',
        kind: 'json',
        description: 'Background HyperFrames project source and foreground speaker video source',
      },
      {
        path: 'course-assembly/element-map.json',
        kind: 'json',
        description: 'Parsed or mocked HyperFrames element map used by the review stage',
      },
      {
        path: 'course-assembly/actions.json',
        kind: 'json',
        description: 'Teaching action library including HyperFrames-derived draft actions',
      },
      {
        path: 'course-assembly/timeline.json',
        kind: 'json',
        description: 'Current assembly timeline with action refs and element bindings',
      },
      {
        path: 'course-assembly/foreground-window.json',
        kind: 'json',
        description: 'Foreground speaker window position, size, shape, and opacity',
      },
      {
        path: 'course-assembly/handoff/codex-handoff.json',
        kind: 'json',
        description: 'Local Codex handoff payload for action or timeline edits',
      },
      {
        path: 'course-assembly/handoff/capcut-manifest.json',
        kind: 'json',
        description: 'Reserved CapCut handoff manifest for later rendering/export',
      },
    ],
    manifest: {
      scope: 'assembly-only',
      includes: ['inputs', 'element-map', 'actions', 'timeline', 'foreground-window', 'handoff'],
      renderTargets: ['remotion', 'hyperframes', 'ffmpeg'],
      capcutHandoff: 'course-assembly/handoff/capcut-manifest.json',
      projectId: state.project.id,
      actionCount: state.actions.length,
      segmentCount: state.timeline.length,
    },
  }
}

function overlayFilesForTimeline(state: CourseWorkbenchState): CoursePackageFile[] {
  const overlayActionIds = state.timeline.flatMap((segment) =>
    segment.actionRefs.filter((ref) => ref.exportableOverlay === true).map((ref) => ref.actionId),
  )

  return overlayActionIds.map((actionId, index) => ({
    path: `course-assembly/handoff/capcut/overlays/${String(index + 1).padStart(3, '0')}-${actionId}-alpha.webm`,
    kind: 'media',
    description: `${actionId} transparent overlay for CapCut upper track`,
  }))
}

export function buildCapCutHandoffPackage(state: CourseWorkbenchState): CapCutHandoffPackage {
  const overlayFiles = overlayFilesForTimeline(state)
  const root = 'course-assembly/handoff/capcut/' as const

  return {
    root,
    files: [
      {
        path: `${root}master-preview.mp4`,
        kind: 'media',
        description: 'Single-file preview for fast review in CapCut',
      },
      {
        path: `${root}background-clean.mp4`,
        kind: 'media',
        description:
          'Background HyperFrames render, including HyperFrames baked/internal animations but excluding platform annotation overlays',
      },
      {
        path: `${root}foreground-speaker.mp4`,
        kind: 'media',
        description: 'Speaker picture-in-picture layer with timing aligned to timeline',
      },
      ...overlayFiles,
      {
        path: `${root}captions.srt`,
        kind: 'caption',
        description: 'Timed subtitle track for import',
      },
      {
        path: `${root}timeline.csv`,
        kind: 'csv',
        description: 'Segment/action timing table for manual rebuild or plugin import',
      },
      {
        path: `${root}edit-guide.md`,
        kind: 'guide',
        description: 'Human-readable CapCut import order and adjustment notes',
      },
      {
        path: `${root}manifest.json`,
        kind: 'json',
        description: 'Machine-readable handoff manifest',
      },
    ],
    guide: [
      '# 剪映/CapCut 导入顺序',
      '',
      '1. 导入 master-preview.mp4 快速确认整体节奏。',
      '2. 精修时使用 background-clean.mp4 作为底轨；background-clean 已包含 HyperFrames 内部动画。',
      '3. 叠加 foreground-speaker.mp4 到人物轨和主音频轨。',
      '4. 按 timeline.csv 导入 overlays/*.webm 到上层轨道；overlays 只包含平台新增标注。',
      '5. 导入 captions.srt 并按 edit-guide.md 微调。',
      '6. editor-only controls are excluded from all rendered output.',
    ].join('\n'),
    manifest: {
      tracks: ['master', 'background', 'foreground', 'overlays', 'captions'],
      sourceProject: state.project.id,
      overlayCount: overlayFiles.length,
    },
  }
}

export function courseWorkbenchReducer(
  state: CourseWorkbenchState,
  action: CourseWorkbenchAction,
): CourseWorkbenchState {
  switch (action.type) {
    case 'select-segment':
      return {
        ...state,
        selectedSegmentId: action.id,
      }

    case 'select-action':
      return {
        ...state,
        selectedActionId: action.id,
      }

    case 'set-aspect-ratio':
      return {
        ...state,
        project: {
          ...state.project,
          aspectRatio: action.aspectRatio,
        },
        stage: {
          ...state.stage,
          canvasAspectRatio: action.aspectRatio,
        },
      }

    case 'seek-frame': {
      const currentFrame = clampFrame(action.frame, state.playback.totalFrames)
      const segment = findSegmentAtFrame(state, currentFrame)

      return {
        ...state,
        playback: {
          ...state.playback,
          currentFrame,
        },
        selectedSegmentId: segment.id,
      }
    }

    case 'set-playing':
      return {
        ...state,
        playback: {
          ...state.playback,
          isPlaying: action.isPlaying,
        },
      }

    case 'select-stage-element': {
      const element = state.stage.elements.find((stageElement) => stageElement.id === action.id)
      const segment = element ? findSegmentAtFrame(state, element.frameRange[0]) : undefined
      const firstBoundRef = findActionRefsForElement(state, action.id)[0]

      return {
        ...state,
        selectedElementId: action.id,
        selectedActionRefId: firstBoundRef?.ref.id,
        selectedActionId: firstBoundRef?.ref.actionId ?? state.selectedActionId,
        selectedSegmentId: segment?.id ?? state.selectedSegmentId,
      }
    }

    case 'select-action-ref': {
      const selected = state.timeline
        .flatMap((segment) => segment.actionRefs)
        .find((ref) => ref.id === action.id)

      return {
        ...state,
        selectedActionRefId: action.id,
        selectedActionId: selected?.actionId ?? state.selectedActionId,
      }
    }

    case 'bind-selected-action-to-element': {
      if (!state.selectedElementId) {
        return state
      }

      const selectedSegment = getSelectedSegment(state)
      const existingRef = state.selectedActionRefId
        ? selectedSegment.actionRefs.find(
            (ref) => ref.id === state.selectedActionRefId && ref.elementId === state.selectedElementId,
          )
        : undefined
      const actionRef = {
        id:
          existingRef?.id
          ?? `ref-${selectedSegment.id}-${state.selectedElementId}-${state.selectedActionId}-${selectedSegment.actionRefs.length + 1}`,
        actionId: state.selectedActionId,
        elementId: state.selectedElementId,
        from: action.from ?? existingRef?.from ?? Math.max(state.playback.currentFrame - selectedSegment.from, 0),
        duration:
          action.duration
          ?? existingRef?.duration
          ?? state.actions.find((libraryAction) => libraryAction.id === state.selectedActionId)
            ?.defaultDurationFrames
          ?? 90,
        fadeInFrames: existingRef?.fadeInFrames ?? 0,
        fadeOutFrames: existingRef?.fadeOutFrames ?? 0,
        exportRole: 'platform-overlay' as const,
        renderedInBackground: false,
        exportableOverlay: true,
      }

      return {
        ...state,
        selectedActionRefId: actionRef.id,
        timeline: state.timeline.map((segment) =>
          segment.id === selectedSegment.id
            ? {
                ...segment,
                actionRefs: existingRef
                  ? segment.actionRefs.map((ref) => (ref.id === existingRef.id ? actionRef : ref))
                  : [...segment.actionRefs, actionRef],
              }
            : segment,
        ),
      }
    }

    case 'update-selected-action-ref': {
      if (!state.selectedActionRefId) {
        return state
      }

      return {
        ...state,
        selectedActionId: action.patch.actionId ?? state.selectedActionId,
        timeline: state.timeline.map((segment) => ({
          ...segment,
          actionRefs: segment.actionRefs.map((ref) =>
            ref.id === state.selectedActionRefId ? { ...ref, ...action.patch } : ref,
          ),
        })),
      }
    }

    case 'remove-selected-action-ref': {
      if (!state.selectedActionRefId) {
        return state
      }

      const nextTimeline = state.timeline.map((segment) => ({
        ...segment,
        actionRefs: segment.actionRefs.filter((ref) => ref.id !== state.selectedActionRefId),
      }))
      const nextState = {
        ...state,
        timeline: nextTimeline,
        selectedActionRefId: undefined,
      }
      const nextElementRef = state.selectedElementId
        ? findActionRefsForElement(nextState, state.selectedElementId)[0]
        : undefined

      return {
        ...nextState,
        selectedActionRefId: nextElementRef?.ref.id,
        selectedActionId: nextElementRef?.ref.actionId ?? state.selectedActionId,
      }
    }

    case 'set-foreground-window':
      return {
        ...state,
        stage: {
          ...state.stage,
          foregroundWindow: {
            ...state.stage.foregroundWindow,
            ...action.patch,
          },
        },
      }

    case 'set-category-filter':
      return {
        ...state,
        categoryFilter: action.category,
      }

    case 'create-action': {
      const newAction = createNewAnimationAction(action.category, nextCustomActionIndex(state.actions))
      return {
        ...state,
        actions: [...state.actions, newAction],
        selectedActionId: newAction.id,
        categoryFilter: action.category,
      }
    }

    case 'update-action':
      return {
        ...state,
        actions: state.actions.map((existing) => {
          if (existing.id !== action.id) {
            return existing
          }

          return {
            ...existing,
            ...action.patch,
            params: action.patch.params ? { ...existing.params, ...action.patch.params } : existing.params,
            presets: action.patch.presets ?? existing.presets,
          }
        }),
      }

    case 'duplicate-action': {
      const source = state.actions.find((existing) => existing.id === action.id)
      if (!source) {
        return state
      }

      const copy: AnimationAction = {
        ...cloneAction(source),
        id: `${source.id}-copy-${nextCustomActionIndex(state.actions)}`,
        name: `${source.name} 副本`,
        status: 'draft',
        version: '0.1.0',
      }

      return {
        ...state,
        actions: [...state.actions, copy],
        selectedActionId: copy.id,
      }
    }

    case 'delete-action': {
      const actions = state.actions.filter((existing) => existing.id !== action.id)
      return {
        ...state,
        actions,
        selectedActionId:
          state.selectedActionId === action.id ? actions[0]?.id ?? '' : state.selectedActionId,
        timeline: state.timeline.map((segment) => ({
          ...segment,
          actionRefs: segment.actionRefs.filter((ref) => ref.actionId !== action.id),
        })),
      }
    }

    case 'move-selected-action':
      return {
        ...state,
        actions: state.actions.map((existing) =>
          existing.id === state.selectedActionId
            ? { ...existing, params: { ...existing.params, x: action.x, y: action.y } }
            : existing,
        ),
      }

    case 'resize-selected-action':
      return {
        ...state,
        actions: state.actions.map((existing) =>
          existing.id === state.selectedActionId
            ? {
                ...existing,
                params: {
                  ...existing.params,
                  width: action.width,
                  height: action.height,
                  radius: action.radius ?? existing.params.radius,
                },
              }
            : existing,
        ),
      }

    case 'set-review-note':
      return {
        ...state,
        reviewNote: action.note,
      }

    case 'generate-handoff':
      return {
        ...state,
        handoffRequests: [buildCodexHandoffRequest(state), ...state.handoffRequests],
      }
  }
}
