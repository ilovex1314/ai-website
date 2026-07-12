import {
  parseCourseProject,
  type CourseProjectV2,
} from '../domain/courseProjectSchema.js'
import type { HyperframesAnimationOverride } from '../workbenchTypes.js'

export type WorkbenchClientOptions = {
  baseUrl?: string
  fetchImplementation?: typeof fetch
}

export type WorkbenchClientErrorBody = {
  code: string
  stage: 'config' | 'import' | 'save' | 'agent' | 'render'
  message: string
  subject?: string
  recovery: string
}

export type WorkbenchRenderResult = {
  outputPath: string
  mediaUrl: string
}

export type HyperframesOverrideRequest = {
  sourcePath: string
  fps: number
  overrides: HyperframesAnimationOverride[]
  renderPreview?: boolean
}

export type HyperframesOverrideResult = {
  workingCopyPath: string
  overridesPath: string
  outputPath?: string
  mediaUrl?: string
}

export class WorkbenchClientError extends Error {
  readonly body: WorkbenchClientErrorBody

  constructor(body: WorkbenchClientErrorBody) {
    super(body.message)
    this.name = 'WorkbenchClientError'
    this.body = body
  }
}

export class WorkbenchClient {
  private readonly baseUrl: string
  private readonly fetchImplementation: typeof fetch

  constructor({ baseUrl = '/api', fetchImplementation = fetch }: WorkbenchClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetchImplementation = fetchImplementation
  }

  async listProjects(): Promise<CourseProjectV2[]> {
    const response = await this.request('/projects')
    const value = (await response.json()) as { projects: unknown[] }
    return value.projects.map((project) => parseCourseProject(project))
  }

  async loadProject(id: string): Promise<CourseProjectV2> {
    const response = await this.request(`/projects/${encodeURIComponent(id)}`)
    return parseCourseProject(await response.json())
  }

  async saveProject(project: CourseProjectV2): Promise<CourseProjectV2> {
    const response = await this.request(`/projects/${encodeURIComponent(project.id)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(project),
    })
    return parseCourseProject(await response.json())
  }

  async renderProject(
    project: CourseProjectV2,
    aspectRatio: CourseProjectV2['activeAspectRatio'],
  ): Promise<WorkbenchRenderResult> {
    const response = await this.request(`/projects/${encodeURIComponent(project.id)}/render`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project, aspectRatio }),
    })
    return (await response.json()) as WorkbenchRenderResult
  }

  async saveHyperframesOverrides(
    projectId: string,
    request: HyperframesOverrideRequest,
  ): Promise<HyperframesOverrideResult> {
    const response = await this.request(`/projects/${encodeURIComponent(projectId)}/hyperframes-overrides`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    return (await response.json()) as HyperframesOverrideResult
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchImplementation(`${this.baseUrl}${path}`, init)

    if (response.ok) {
      return response
    }

    let body: WorkbenchClientErrorBody

    try {
      body = (await response.json()) as WorkbenchClientErrorBody
    } catch {
      body = {
        code: 'NETWORK_ERROR',
        stage: 'config',
        message: `Workbench request failed with status ${response.status}`,
        recovery: 'Confirm the local Workbench Service is running and try again.',
      }
    }

    throw new WorkbenchClientError(body)
  }
}
