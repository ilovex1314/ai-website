import { cleanup, render, screen } from '@testing-library/react'
import { forwardRef, useImperativeHandle } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CoursePreviewStage } from '../CoursePreviewStage'
import { createDefaultCourseWorkbenchState } from '../courseWorkbenchData'
import type { CourseProjectV2 } from '../domain/courseProjectSchema'
import { CourseComposition } from './CourseComposition'
import { calculateCourseMetadata, RemotionRoot } from './Root'

let remotionFrame = 0
let emitPlayerFrame: ((frame: number) => void) | undefined

vi.mock('remotion', () => ({
  AbsoluteFill: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  Composition: ({ id, durationInFrames, fps, width, height }: Record<string, unknown>) => (
    <div
      data-testid={`composition-${String(id)}`}
      data-duration-in-frames={String(durationInFrames)}
      data-fps={String(fps)}
      data-height={String(height)}
      data-width={String(width)}
    />
  ),
  OffthreadVideo: ({ volume, muted, ...props }: React.ComponentProps<'video'> & { volume?: number }) => (
    <video {...props} data-muted={String(Boolean(muted))} data-volume={String(volume ?? 1)} />
  ),
  Sequence: ({ children, durationInFrames }: React.PropsWithChildren<{ durationInFrames?: number }>) => (
    <div data-duration-in-frames={durationInFrames}>{children}</div>
  ),
  registerRoot: vi.fn(),
  useCurrentFrame: () => remotionFrame,
}))

vi.mock('@remotion/player', () => ({
  Player: forwardRef(function MockPlayer(
    props: {
      component: React.ComponentType<Record<string, unknown>>
      inputProps: Record<string, unknown>
      initialFrame?: number
    },
    ref,
  ) {
    const listeners = new Map<string, (event: { detail: { frame: number } }) => void>()
    const Component = props.component

    useImperativeHandle(ref, () => ({
      addEventListener: (name: string, listener: (event: { detail: { frame: number } }) => void) => {
        listeners.set(name, listener)
        if (name === 'frameupdate') {
          emitPlayerFrame = (frame: number) => listener({ detail: { frame } })
        }
      },
      removeEventListener: (name: string) => listeners.delete(name),
      getCurrentFrame: () => props.initialFrame ?? 0,
      isPlaying: () => false,
      pause: vi.fn(),
      play: vi.fn(),
      seekTo: vi.fn(),
      toggle: vi.fn(),
    }))

    return (
      <div data-testid="mock-remotion-player">
        <Component {...props.inputProps} />
      </div>
    )
  }),
}))

type FixtureProject = CourseProjectV2 & {
  durationFrames: number
  source: CourseProjectV2['source'] & {
    background: CourseProjectV2['source']['background'] & { mediaUrl: string }
    foreground: {
      mediaUrl: string
      durationFrames: number
      window: {
        x: number
        y: number
        width: number
        height: number
        shape: 'rounded'
        opacity: number
      }
    }
  }
}

const fixture: FixtureProject = {
  version: 2,
  id: 'course-composition-fixture',
  title: 'Course Composition Fixture',
  fps: 30,
  activeAspectRatio: '9:16',
  durationFrames: 600,
  source: {
    background: {
      id: 'hf-course-composition-fixture',
      projectPath: '/projects/course-composition-fixture',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
      mediaUrl: '/background.mp4',
    },
    foreground: {
      mediaUrl: '/foreground.mp4',
      durationFrames: 300,
      window: { x: 64, y: 58, width: 24, height: 30, shape: 'rounded', opacity: 0.9 },
    },
    bakedAnimations: [
      {
        id: 'baked-title-pop',
        elementId: 'intro-title',
        fromFrame: 0,
        durationFrames: 120,
        exportRole: 'baked-internal',
      },
    ],
  },
  actionTemplates: [
    {
      id: 'circle-mark',
      name: 'Circle Mark',
      category: 'circle',
      description: 'Marks a title.',
      status: 'ready',
      version: '1.0.0',
      defaultDurationFrames: 80,
      params: { x: 8, y: 12, width: 24, height: 16, color: '#ef4444', label: 'Template' },
      presets: [],
      implementation: {
        mode: 'parametric',
        intent: 'Mark a title.',
        componentContract: 'Render a circle.',
        outputFiles: ['circle.tsx'],
        acceptance: ['Circle is visible.'],
      },
    },
  ],
  actionInstances: [
    {
      id: 'active-circle',
      templateId: 'circle-mark',
      fromFrame: 18,
      durationFrames: 80,
      exportRole: 'platform-overlay',
      params: { x: 20, color: '#2563eb', label: 'Instance' },
      layoutByAspect: {
        '9:16': {
          anchor: { kind: 'canvas' },
          inset: { top: 40, right: 50, bottom: 60, left: 30 },
        },
      },
    },
    {
      id: 'later-circle',
      templateId: 'circle-mark',
      fromFrame: 180,
      durationFrames: 40,
      exportRole: 'platform-overlay',
      params: {},
      layoutByAspect: {},
    },
  ],
}

function setRemotionFrame(frame: number) {
  remotionFrame = frame
}

afterEach(cleanup)

describe('CourseComposition', () => {
  beforeEach(() => {
    setRemotionFrame(30)
    emitPlayerFrame = undefined
  })

  it('uses foreground audio and mutes background', () => {
    render(<CourseComposition project={fixture} aspectRatio="9:16" />)

    expect(screen.getByTestId('background-video')).toHaveAttribute('data-volume', '0')
    expect(screen.getByTestId('background-video')).toHaveAttribute('data-muted', 'true')
    expect(screen.getByTestId('foreground-video')).toHaveAttribute('data-volume', '1')
    expect(screen.getByTestId('foreground-video')).toHaveAttribute('data-muted', 'false')
  })

  it('hides a short foreground after its last frame', () => {
    setRemotionFrame(301)

    render(<CourseComposition project={fixture} aspectRatio="9:16" />)

    expect(screen.queryByTestId('foreground-window')).not.toBeInTheDocument()
  })

  it('truncates a long foreground at the background duration', () => {
    const longForeground = {
      ...fixture,
      source: {
        ...fixture.source,
        foreground: { ...fixture.source.foreground, durationFrames: 900 },
      },
    }

    render(<CourseComposition project={longForeground} aspectRatio="9:16" />)

    expect(screen.getByTestId('foreground-window').parentElement).toHaveAttribute(
      'data-duration-in-frames',
      '600',
    )
  })

  it('renders only the active platform overlay with template, instance, then aspect layout precedence', () => {
    render(<CourseComposition project={fixture} aspectRatio="9:16" />)

    const overlay = screen.getByTestId('action-overlay-active-circle')
    expect(overlay).toHaveTextContent('Instance')
    expect(overlay).toHaveStyle({
      left: '30px',
      top: '40px',
      right: '50px',
      bottom: '60px',
      color: '#2563eb',
    })
    expect(screen.queryByTestId('action-overlay-later-circle')).not.toBeInTheDocument()
    expect(screen.queryByText('baked-title-pop')).not.toBeInTheDocument()
    expect(document.querySelector('[data-editor-only="true"]')).not.toBeInTheDocument()
  })
})

describe('RemotionRoot', () => {
  it('registers the CourseWorkbench render target', () => {
    render(<RemotionRoot />)

    expect(screen.getByTestId('composition-CourseWorkbench')).toHaveAttribute('data-fps', '30')
    expect(screen.getByTestId('composition-CourseWorkbench')).toHaveAttribute('data-width', '1080')
    expect(screen.getByTestId('composition-CourseWorkbench')).toHaveAttribute('data-height', '1920')
  })

  it('derives render duration and dimensions from input props', async () => {
    await expect(
      calculateCourseMetadata({
        props: { project: fixture, aspectRatio: '16:9' },
      } as never),
    ).resolves.toMatchObject({ durationInFrames: 600, width: 1920, height: 1080 })
  })
})

describe('CoursePreviewStage', () => {
  it('uses Player as the media clock and keeps editor overlays outside the composition', () => {
    const state = createDefaultCourseWorkbenchState()
    const dispatch = vi.fn()

    render(
      <CoursePreviewStage
        action={state.actions[0]}
        segment={state.timeline[0]}
        stage={state.stage}
        playback={state.playback}
        timeline={state.timeline}
        actions={state.actions}
        selectedElementId={state.stage.elements[0].id}
        fps={state.project.fps}
        dispatch={dispatch}
      />,
    )

    expect(screen.getByTestId('mock-remotion-player')).toBeInTheDocument()
    expect(screen.queryByTestId('background-preview-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('foreground-preview-video')).not.toBeInTheDocument()
    expect(screen.getByTestId('foreground-resize-handle').closest('.course-composition')).toBeNull()

    emitPlayerFrame?.(42)
    expect(dispatch).toHaveBeenCalledWith({ type: 'seek-frame', frame: 42 })
  })
})
