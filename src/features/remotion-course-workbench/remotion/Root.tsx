import { Composition, registerRoot } from 'remotion'
import type { CalculateMetadataFunction } from 'remotion'
import type { CourseProjectV2 } from '../domain/courseProjectSchema'
import '../RemotionCourseWorkbench.css'
import {
  compositionDimensions,
  CourseComposition,
  type CourseCompositionProps,
  selectCourseDurationFrames,
} from './CourseComposition'

const demoMediaUrl = 'https://remotion.media/video.mp4'

const defaultProject = {
  version: 2,
  id: 'codex-keyframes-tutorial',
  title: 'Codex Keyframes Tutorial',
  fps: 30,
  activeAspectRatio: '9:16',
  durationFrames: 4726,
  source: {
    background: {
      id: 'hf-codex-keyframes-tutorial',
      projectPath: '/Volumes/2TB-NVMe/work/image2/codex-keyframes-tutorial',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
      mediaUrl: demoMediaUrl,
    },
    foreground: {
      mediaUrl: demoMediaUrl,
      durationFrames: 4726,
      window: { x: 67, y: 61, width: 26, height: 30, shape: 'rounded', opacity: 1 },
    },
    bakedAnimations: [],
  },
  actionTemplates: [
    {
      id: 'circle-mark',
      name: '重点标注',
      category: 'circle',
      description: 'Highlight a course detail.',
      status: 'ready',
      version: '1.0.0',
      defaultDurationFrames: 120,
      params: {
        color: '#ef4444',
        label: '核心步骤',
        backgroundColor: '#ffffff',
        backgroundOpacity: 0.08,
        borderRadius: 32,
      },
      presets: [],
      implementation: {
        mode: 'parametric',
        intent: 'Highlight a course detail.',
        componentContract: 'Render a timed course overlay.',
        outputFiles: ['circle-mark.tsx'],
        acceptance: ['Visible at its active frame.'],
      },
    },
  ],
  actionInstances: [
    {
      id: 'root-still-overlay',
      templateId: 'circle-mark',
      fromFrame: 0,
      durationFrames: 120,
      exportRole: 'platform-overlay',
      params: {},
      layoutByAspect: {
        '9:16': {
          anchor: { kind: 'canvas' },
          inset: { top: 390, right: 130, bottom: 1130, left: 110 },
        },
      },
    },
  ],
} as unknown as CourseProjectV2

const defaultProps: CourseCompositionProps = {
  project: defaultProject,
  aspectRatio: '9:16',
}

export const calculateCourseMetadata: CalculateMetadataFunction<CourseCompositionProps> = async ({ props }) => {
  const dimensions = compositionDimensions[props.aspectRatio]
  return {
    durationInFrames: selectCourseDurationFrames(props.project),
    width: dimensions.width,
    height: dimensions.height,
  }
}

export function RemotionRoot() {
  return (
    <Composition
      calculateMetadata={calculateCourseMetadata}
      component={CourseComposition}
      defaultProps={defaultProps}
      durationInFrames={selectCourseDurationFrames(defaultProject)}
      fps={defaultProject.fps}
      height={compositionDimensions['9:16'].height}
      id="CourseWorkbench"
      width={compositionDimensions['9:16'].width}
    />
  )
}

registerRoot(RemotionRoot)
