import { mkdir, realpath } from 'node:fs/promises'
import { delimiter, resolve } from 'node:path'

export type WorkbenchAgentProvider = 'codex' | 'mock'

export type WorkbenchConfig = {
  projectRoot: string
  allowedSourceRoots: string[]
  port: number
  agentProvider: WorkbenchAgentProvider
}

function readPort(value: string | undefined): number {
  if (value === undefined || value.length === 0) {
    return 4319
  }

  const port = Number(value)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('WORKBENCH_PORT must be an integer between 1 and 65535')
  }

  return port
}

function readAgentProvider(value: string | undefined): WorkbenchAgentProvider {
  if (value === undefined || value.length === 0 || value === 'mock') {
    return 'mock'
  }

  if (value === 'codex') {
    return 'codex'
  }

  throw new Error('WORKBENCH_AGENT_PROVIDER must be "mock" or "codex"')
}

export async function loadWorkbenchConfig(environment = process.env): Promise<WorkbenchConfig> {
  const projectRoot = resolve(environment.WORKBENCH_PROJECT_ROOT ?? '.course-workbench/projects')
  await mkdir(projectRoot, { recursive: true })

  const configuredRoots = environment.WORKBENCH_ALLOWED_SOURCE_ROOTS?.split(delimiter).filter(Boolean)
  const allowedSourceRoots = await Promise.all(
    (configuredRoots?.length ? configuredRoots : [process.cwd()]).map((path) => realpath(resolve(path))),
  )

  return {
    projectRoot: await realpath(projectRoot),
    allowedSourceRoots,
    port: readPort(environment.WORKBENCH_PORT),
    agentProvider: readAgentProvider(environment.WORKBENCH_AGENT_PROVIDER),
  }
}
