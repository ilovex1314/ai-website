import { constants } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { WorkbenchServiceError, type WorkbenchErrorStage } from './projectRepository.js'

export function isContainedPath(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))
}

type ContainedPathOptions = {
  allowMissing?: boolean
  rejectSymlinks?: boolean
  code: string
  stage: WorkbenchErrorStage
  message: string
  recovery: string
}

function pathError(candidate: string, options: ContainedPathOptions): WorkbenchServiceError {
  return new WorkbenchServiceError({
    code: options.code,
    stage: options.stage,
    message: options.message,
    subject: candidate,
    recovery: options.recovery,
  })
}

async function nearestExistingCanonical(candidate: string): Promise<{ canonical: string; existing: string }> {
  let existing = candidate

  while (true) {
    try {
      return { canonical: await realpath(existing), existing }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || dirname(existing) === existing) {
        throw error
      }

      existing = dirname(existing)
    }
  }
}

export async function resolveContainedPath(
  root: string,
  candidate: string,
  options: ContainedPathOptions,
): Promise<string> {
  const canonicalRoot = await realpath(root)
  const requested = resolve(canonicalRoot, candidate)

  if (!isContainedPath(canonicalRoot, requested)) {
    throw pathError(requested, options)
  }

  if (options.rejectSymlinks) {
    const segments = relative(canonicalRoot, requested).split(/[\\/]/u).filter(Boolean)
    let current = canonicalRoot

    for (const segment of segments) {
      current = resolve(current, segment)

      try {
        if ((await lstat(current)).isSymbolicLink()) {
          throw pathError(requested, options)
        }
      } catch (error) {
        if (error instanceof WorkbenchServiceError) {
          throw error
        }

        if ((error as NodeJS.ErrnoException).code === 'ENOENT' && options.allowMissing) {
          break
        }

        throw error
      }
    }
  }

  try {
    await lstat(requested)
    const canonical = await realpath(requested)

    if (!isContainedPath(canonicalRoot, canonical)) {
      throw pathError(requested, options)
    }

    return canonical
  } catch (error) {
    if (error instanceof WorkbenchServiceError) {
      throw error
    }

    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || options.allowMissing !== true) {
      throw pathError(requested, options)
    }

    const { canonical, existing } = await nearestExistingCanonical(requested)

    if (!isContainedPath(canonicalRoot, canonical)) {
      throw pathError(requested, options)
    }

    return resolve(canonical, relative(existing, requested))
  }
}

export function resolveProjectArtifactPath(
  projectDirectory: string,
  artifactPath: string,
  allowMissing = true,
): Promise<string> {
  return resolveContainedPath(projectDirectory, artifactPath, {
    allowMissing,
    rejectSymlinks: true,
    code: 'PROJECT_ARTIFACT_PATH_NOT_ALLOWED',
    stage: 'save',
    message: 'Project artifact destination must stay inside the project without symlinks',
    recovery: 'Remove symlinks from project artifact directories and files, then retry the import.',
  })
}

export async function writeFileNoFollow(path: string, data: string | Uint8Array): Promise<void> {
  const handle = await open(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
    0o600,
  )

  try {
    await handle.writeFile(data)
  } finally {
    await handle.close()
  }
}
