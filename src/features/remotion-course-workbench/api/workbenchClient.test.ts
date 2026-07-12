import { describe, expect, it, vi } from 'vitest'
import { createDefaultCourseWorkbenchState } from '../courseWorkbenchData'
import { buildCompositionProject } from '../CoursePreviewStage'
import { WorkbenchClient } from './workbenchClient'

describe('WorkbenchClient render', () => {
  it('submits the current composition and returns the rendered media location', async () => {
    const state = createDefaultCourseWorkbenchState()
    const project = buildCompositionProject(
      state.stage,
      state.timeline,
      state.actions,
      state.project.fps,
      state.playback.totalFrames,
    )
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      outputPath: '/tmp/master-9x16.mp4',
      mediaUrl: '/@fs/tmp/master-9x16.mp4',
    }), { status: 201, headers: { 'content-type': 'application/json' } }))
    const client = new WorkbenchClient({ fetchImplementation })

    await expect(client.renderProject(project, '9:16')).resolves.toEqual({
      outputPath: '/tmp/master-9x16.mp4',
      mediaUrl: '/@fs/tmp/master-9x16.mp4',
    })
    expect(fetchImplementation).toHaveBeenCalledWith(
      `/api/projects/${encodeURIComponent(project.id)}/render`,
      expect.objectContaining({ method: 'POST' }),
    )
    const request = fetchImplementation.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(String(request.body))).toEqual({ project, aspectRatio: '9:16' })
  })
})
