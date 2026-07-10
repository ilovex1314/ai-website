import { existsSync, realpathSync } from 'node:fs'
import { mkdir, readFile, readdir, realpath, rename, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import {
  parseCourseProject,
  type CourseProjectV2,
} from '../../src/features/remotion-course-workbench/domain/courseProjectSchema.js'

export type WorkbenchErrorStage = 'config' | 'import' | 'save' | 'agent' | 'render'

export class WorkbenchServiceError extends Error {
  readonly code: string
  readonly stage: WorkbenchErrorStage
  readonly subject?: string
  readonly recovery: string

  constructor({
    code,
    stage,
    message,
    subject,
    recovery,
  }: {
    code: string
    stage: WorkbenchErrorStage
    message: string
    subject?: string
    recovery: string
  }) {
    super(message)
    this.name = 'WorkbenchServiceError'
    this.code = code
    this.stage = stage
    this.subject = subject
    this.recovery = recovery
  }
}

function isContainedPath(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === '' || (!/^\.\.(?:[\\/]|$)/.test(pathFromRoot) && !isAbsolute(pathFromRoot))
}

function assertProjectId(id: string): void {
  if (id.length === 0 || id === '.' || id === '..' || id.includes('/') || id.includes('\\')) {
    throw new WorkbenchServiceError({
      code: 'INVALID_PROJECT_ID',
      stage: 'save',
      message: 'Project id must be a single directory name',
      subject: id,
      recovery: 'Use a project id without path separators.',
    })
  }
}

export type ProjectRepository = {
  importPath(sourcePath: string): Promise<string>
  list(): Promise<CourseProjectV2[]>
  load(id: string): Promise<CourseProjectV2>
  save(project: CourseProjectV2): Promise<CourseProjectV2>
}

export function createProjectRepository(projectRoot: string, allowedSourceRoots: string[] = []): ProjectRepository {
  const resolvedProjectRoot = resolve(projectRoot)
  const resolvedSourceRoots = allowedSourceRoots.map((sourceRoot) => realpathSync(sourceRoot))

  function projectFile(id: string): string {
    assertProjectId(id)
    const directory = resolve(resolvedProjectRoot, id)

    if (!isContainedPath(resolvedProjectRoot, directory)) {
      throw new WorkbenchServiceError({
        code: 'INVALID_PROJECT_ID',
        stage: 'save',
        message: 'Project id resolves outside the configured project root',
        subject: id,
        recovery: 'Use a project id without path traversal.',
      })
    }

    return resolve(directory, 'project.json')
  }

  return {
    async importPath(sourcePath) {
      let resolvedSourcePath: string

      try {
        resolvedSourcePath = await realpath(sourcePath)
      } catch {
        throw new WorkbenchServiceError({
          code: 'SOURCE_NOT_ALLOWED',
          stage: 'import',
          message: 'Source project path does not resolve to an allowed directory',
          subject: sourcePath,
          recovery: 'Choose an existing project inside WORKBENCH_ALLOWED_SOURCE_ROOTS.',
        })
      }

      if (!resolvedSourceRoots.some((root) => isContainedPath(root, resolvedSourcePath))) {
        throw new WorkbenchServiceError({
          code: 'SOURCE_NOT_ALLOWED',
          stage: 'import',
          message: 'Source project path is outside the configured allowed roots',
          subject: sourcePath,
          recovery: 'Choose a project inside WORKBENCH_ALLOWED_SOURCE_ROOTS.',
        })
      }

      return resolvedSourcePath
    },

    async list() {
      if (!existsSync(resolvedProjectRoot)) {
        return []
      }

      const entries = await readdir(resolvedProjectRoot, { withFileTypes: true })
      const projectIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
      const projects = await Promise.all(
        projectIds.map(async (id) => {
          try {
            return await this.load(id)
          } catch (error) {
            if (error instanceof WorkbenchServiceError && error.code === 'PROJECT_NOT_FOUND') {
              return undefined
            }
            throw error
          }
        }),
      )

      return projects.filter((project): project is CourseProjectV2 => project !== undefined)
    },

    async load(id) {
      const file = projectFile(id)

      try {
        return parseCourseProject(JSON.parse(await readFile(file, 'utf8')))
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
          throw new WorkbenchServiceError({
            code: 'PROJECT_NOT_FOUND',
            stage: 'import',
            message: 'Project was not found',
            subject: id,
            recovery: 'Create the project before loading it.',
          })
        }

        throw error
      }
    },

    async save(project) {
      const parsedProject = parseCourseProject(project)
      const file = projectFile(parsedProject.id)
      const temporaryFile = `${file}.tmp`
      await mkdir(resolve(file, '..'), { recursive: true })
      await writeFile(temporaryFile, `${JSON.stringify(parsedProject, null, 2)}\n`, 'utf8')
      await rename(temporaryFile, file)

      return parsedProject
    },
  }
}
