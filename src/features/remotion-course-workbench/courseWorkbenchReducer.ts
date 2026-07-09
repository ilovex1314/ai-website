import { createNewAnimationAction } from './animationLibraryModel'
import type {
  AnimationAction,
  CapCutHandoffPackage,
  CodexHandoffRequest,
  CoursePackageFile,
  CourseProjectPackage,
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

export function buildCourseProjectPackage(state: CourseWorkbenchState): CourseProjectPackage {
  const actionFiles: CoursePackageFile[] = state.actions.map((animationAction) => ({
    path: `course-project/actions/${animationAction.id}.json`,
    kind: 'json',
    description: `${animationAction.name} action definition and presets`,
  }))

  return {
    root: 'course-project/',
    files: [
      {
        path: 'course-project/project.json',
        kind: 'json',
        description: 'Course project metadata, fps, aspect ratio, target platform, and style',
      },
      {
        path: 'course-project/assets.json',
        kind: 'json',
        description: 'Speaker, slides, captions, script, and export asset registry',
      },
      {
        path: 'course-project/timeline.json',
        kind: 'json',
        description: 'Timeline segments, slide references, speaker layouts, captions, and action refs',
      },
      ...actionFiles,
      {
        path: 'course-project/exports/manifest.json',
        kind: 'json',
        description: 'Export targets for Remotion, HyperFrames, FFmpeg, and CapCut handoff',
      },
    ],
    manifest: {
      primarySource: 'project-files',
      renderTargets: ['remotion', 'hyperframes', 'ffmpeg'],
      capcutHandoff: 'course-project/exports/capcut-handoff/manifest.json',
      projectId: state.project.id,
      actionCount: state.actions.length,
      segmentCount: state.timeline.length,
    },
  }
}

function overlayFilesForTimeline(state: CourseWorkbenchState): CoursePackageFile[] {
  const overlayActionIds = state.timeline
    .flatMap((segment) => segment.actionRefs.map((ref) => ref.actionId))

  return overlayActionIds.map((actionId, index) => ({
    path: `course-project/exports/capcut-handoff/overlays/${String(index + 1).padStart(3, '0')}-${actionId}-alpha.webm`,
    kind: 'media',
    description: `${actionId} transparent overlay for CapCut upper track`,
  }))
}

export function buildCapCutHandoffPackage(state: CourseWorkbenchState): CapCutHandoffPackage {
  const overlayFiles = overlayFilesForTimeline(state)
  const root = 'course-project/exports/capcut-handoff/'

  return {
    root,
    files: [
      {
        path: `${root}master-preview.mp4`,
        kind: 'media',
        description: 'Single-file preview for fast review in CapCut',
      },
      {
        path: `${root}clean-ppt-video.mp4`,
        kind: 'media',
        description: 'PPT background and camera motion without speaker or annotation overlays',
      },
      {
        path: `${root}speaker-pip.mp4`,
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
        path: `${root}captions.txt`,
        kind: 'caption',
        description: 'Plain caption text for manual editing',
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
      '2. 精修时使用 clean-ppt-video.mp4 作为底轨。',
      '3. 叠加 speaker-pip.mp4 到人物轨。',
      '4. 按 timeline.csv 导入 overlays/*.webm 到上层轨道。',
      '5. 导入 captions.srt 或使用 captions.txt 手动重建字幕。',
    ].join('\n'),
    manifest: {
      tracks: ['master', 'clean-ppt', 'speaker-pip', 'overlays', 'captions'],
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
