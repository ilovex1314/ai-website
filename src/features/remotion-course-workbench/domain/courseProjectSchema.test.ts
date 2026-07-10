import { describe, expect, it } from 'vitest'
import { migrateLegacyWorkbenchState } from './courseProjectMigration.js'
import { actionInstanceSchema, parseCourseProject } from './courseProjectSchema.js'

const validFixture = {
  version: 2,
  id: 'codex-keyframes-tutorial',
  title: 'Codex Keyframes Tutorial',
  fps: 30,
  activeAspectRatio: '9:16',
  source: {
    background: {
      id: 'hf-codex-keyframes-tutorial',
      projectPath: '/projects/codex-keyframes-tutorial',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
    },
    bakedAnimations: [
      {
        id: 'hf-intro-progress',
        elementId: 'intro-progress',
        fromFrame: 0,
        durationFrames: 210,
        exportRole: 'baked-internal',
      },
    ],
  },
  actionTemplates: [
    {
      id: 'circle-mark',
      version: '1.0.0',
      name: 'Red Circle',
      category: 'circle',
      source: 'manual',
      description: 'Marks an important title.',
      status: 'ready',
      defaultDurationFrames: 80,
      params: { color: '#ef4444', radius: 18 },
      presets: [{ id: 'warning-circle', label: 'Warning Circle', params: { color: '#ef4444' } }],
      implementation: {
        mode: 'parametric',
        intent: 'Marks an important title.',
        componentContract: 'Render a circle from typed params.',
        outputFiles: ['actions.json'],
        acceptance: ['Preview reflects params immediately'],
      },
    },
  ],
  actionInstances: [
    {
      id: 'intro-circle',
      templateId: 'circle-mark',
      fromFrame: 18,
      durationFrames: 80,
      exportRole: 'platform-overlay',
      params: { color: '#2563eb' },
      layoutByAspect: {
        '9:16': {
          anchor: { kind: 'element', elementId: 'intro-title' },
          inset: { top: -12, right: -16, bottom: -12, left: -16 },
        },
      },
    },
  ],
}

const invalidBakedFixture = {
  ...validFixture,
  actionInstances: [
    {
      ...validFixture.actionInstances[0],
      exportRole: 'baked-internal',
    },
  ],
}

const legacyWorkbenchState = {
  project: {
    id: 'legacy-course',
    title: 'Legacy Course',
    aspectRatio: '9:16',
    fps: 30,
  },
  stage: {
    backgroundSource: {
      id: 'legacy-hyperframes',
      projectPath: '/projects/legacy-course',
      entryHtml: 'index.html',
      assetsDir: 'assets',
      sourceAspectRatio: '9:16',
    },
  },
  actions: [
    {
      id: 'circle-mark',
      name: 'Circle Mark',
      category: 'circle',
      description: 'Marks an important part of a slide.',
      status: 'ready',
      version: '1.0.0',
      defaultDurationFrames: 80,
      params: { color: '#ef4444', radius: 18 },
      presets: [{ id: 'warning-circle', label: 'Warning Circle', params: { color: '#ef4444' } }],
      implementation: {
        mode: 'parametric',
        intent: 'Mark an important part of a slide.',
        componentContract: 'Render a circle from typed params.',
        outputFiles: ['actions.json'],
        acceptance: ['Preview reflects params immediately'],
      },
    },
  ],
  timeline: [
    {
      id: 'intro',
      from: 100,
      actionRefs: [
        {
          id: 'intro-circle-a',
          actionId: 'circle-mark',
          from: 12,
          duration: 80,
          exportRole: 'platform-overlay',
          params: { color: '#2563eb' },
        },
        {
          id: 'intro-circle-b',
          actionId: 'circle-mark',
          from: 120,
          duration: 80,
          exportRole: 'platform-overlay',
          params: { color: '#16a34a' },
        },
      ],
    },
  ],
}

describe('CourseProjectV2 schema', () => {
  it('keeps template defaults separate from instance overrides', () => {
    const project = parseCourseProject(validFixture)

    expect(project.actionTemplates[0]).not.toHaveProperty('layoutByAspect')
    expect(project.actionInstances[0].layoutByAspect['9:16']).toEqual({
      anchor: { kind: 'element', elementId: 'intro-title' },
      inset: { top: -12, right: -16, bottom: -12, left: -16 },
    })
  })

  it('rejects layout overrides stored on templates', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionTemplates: [
          {
            ...validFixture.actionTemplates[0],
            layoutByAspect: validFixture.actionInstances[0].layoutByAspect,
          },
        ],
      }),
    ).toThrow(/layoutByAspect/)
  })

  it('rejects instance-only timing and position fields stored on templates', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionTemplates: [
          {
            ...validFixture.actionTemplates[0],
            fromFrame: 12,
            durationFrames: 80,
            dragX: 24,
            dragY: 48,
            x: 24,
            y: 48,
            position: { x: 24, y: 48 },
            layoutOverride: validFixture.actionInstances[0].layoutByAspect['9:16'],
          },
        ],
      }),
    ).toThrow(/fromFrame|durationFrames|dragX|dragY|x|y|position|layoutOverride/)
  })

  it('rejects top-level drag coordinates stored on templates', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionTemplates: [
          {
            ...validFixture.actionTemplates[0],
            x: 24,
            y: 48,
          },
        ],
      }),
    ).toThrow(/x|y/)
  })

  it('rejects unrecognised timing and transform fields stored on templates', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionTemplates: [
          {
            ...validFixture.actionTemplates[0],
            startFrame: 12,
            duration: 80,
            translateX: 24,
            transform: 'translateX(24px)',
          },
        ],
      }),
    ).toThrow(/startFrame|duration|translateX|transform/)
  })

  it('rejects baked animations as exportable overlays', () => {
    expect(() => parseCourseProject(invalidBakedFixture)).toThrow(/baked-internal/)
  })

  it('rejects non-overlay roles from action instances', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionInstances: [
          {
            ...validFixture.actionInstances[0],
            exportRole: 'editor-only',
          },
        ],
      }),
    ).toThrow(/editor-only/)
  })

  it('rejects non-overlay roles from actionInstanceSchema directly', () => {
    expect(() =>
      actionInstanceSchema.parse({
        ...validFixture.actionInstances[0],
        exportRole: 'baked-internal',
      }),
    ).toThrow(/platform-overlay/)
  })

  it('keeps all three aspect layouts independent on one instance', () => {
    const project = parseCourseProject({
      ...validFixture,
      actionInstances: [
        {
          ...validFixture.actionInstances[0],
          layoutByAspect: {
            '16:9': {
              anchor: { kind: 'canvas' },
              inset: { top: 8, right: 12, bottom: 8, left: 12 },
            },
            '4:3': {
              anchor: { kind: 'element', elementId: 'concept-title' },
              inset: { top: -4, right: -8, bottom: -4, left: -8 },
            },
            '9:16': validFixture.actionInstances[0].layoutByAspect['9:16'],
          },
        },
      ],
    })

    const layouts = project.actionInstances[0].layoutByAspect
    expect(layouts['16:9']).toEqual({
      anchor: { kind: 'canvas' },
      inset: { top: 8, right: 12, bottom: 8, left: 12 },
    })
    expect(layouts['4:3']).toEqual({
      anchor: { kind: 'element', elementId: 'concept-title' },
      inset: { top: -4, right: -8, bottom: -4, left: -8 },
    })
    expect(layouts['9:16']).toEqual(validFixture.actionInstances[0].layoutByAspect['9:16'])

    const widescreenLayout = layouts['16:9']
    expect(widescreenLayout).toBeDefined()
    widescreenLayout!.inset.left = 99
    expect(layouts['4:3']?.inset.left).toBe(-8)
    expect(layouts['9:16']?.inset.left).toBe(-16)
  })

  it('rejects duplicate template and action-instance IDs', () => {
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionTemplates: [...validFixture.actionTemplates, { ...validFixture.actionTemplates[0] }],
      }),
    ).toThrow(/duplicate action template id/i)
    expect(() =>
      parseCourseProject({
        ...validFixture,
        actionInstances: [...validFixture.actionInstances, { ...validFixture.actionInstances[0] }],
      }),
    ).toThrow(/duplicate action instance id/i)
  })

  it('migrates legacy actions into independent timeline instances', () => {
    const project = migrateLegacyWorkbenchState(legacyWorkbenchState)

    expect(project.actionTemplates).toHaveLength(1)
    expect(project.actionTemplates[0]).toMatchObject({
      id: 'circle-mark',
      params: { color: '#ef4444', radius: 18 },
      description: 'Marks an important part of a slide.',
      presets: [{ id: 'warning-circle', label: 'Warning Circle', params: { color: '#ef4444' } }],
      implementation: {
        mode: 'parametric',
        intent: 'Mark an important part of a slide.',
      },
    })
    expect(project.actionInstances).toEqual([
      expect.objectContaining({
        id: 'intro-circle-a',
        templateId: 'circle-mark',
        fromFrame: 112,
        params: { color: '#2563eb' },
      }),
      expect.objectContaining({
        id: 'intro-circle-b',
        templateId: 'circle-mark',
        fromFrame: 220,
        params: { color: '#16a34a' },
      }),
    ])

    project.actionInstances[0].fromFrame = 300
    project.actionInstances[0].params.color = '#f59e0b'

    expect(project.actionInstances[1].fromFrame).toBe(220)
    expect(project.actionInstances[1].params.color).toBe('#16a34a')
    expect(project.actionTemplates[0].params.color).toBe('#ef4444')
  })

  it('deeply clones nested legacy params for every migrated instance', () => {
    const sharedParams = { palette: [{ color: '#2563eb' }], label: { text: 'Focus' } }
    const project = migrateLegacyWorkbenchState({
      ...legacyWorkbenchState,
      timeline: [
        {
          ...legacyWorkbenchState.timeline[0],
          actionRefs: legacyWorkbenchState.timeline[0].actionRefs.map((ref) => ({
            ...ref,
            params: sharedParams,
          })),
        },
      ],
    })
    const firstParams = project.actionInstances[0].params as typeof sharedParams
    const secondParams = project.actionInstances[1].params as typeof sharedParams

    firstParams.palette[0].color = '#f59e0b'
    firstParams.label.text = 'Changed'

    expect(secondParams.palette[0].color).toBe('#2563eb')
    expect(secondParams.label.text).toBe('Focus')
  })

  it('rejects duplicate legacy action reference IDs', () => {
    expect(() =>
      migrateLegacyWorkbenchState({
        ...legacyWorkbenchState,
        timeline: [
          {
            ...legacyWorkbenchState.timeline[0],
            actionRefs: legacyWorkbenchState.timeline[0].actionRefs.map((ref) => ({
              ...ref,
              id: 'duplicate-reference',
            })),
          },
        ],
      }),
    ).toThrow(/duplicate action instance id/i)
  })
})
