import { execFile, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { basename, delimiter, dirname, resolve } from 'node:path'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const viteCli = resolve(workspaceRoot, 'node_modules/vite/bin/vite.js')
const tsxCli = resolve(workspaceRoot, 'node_modules/tsx/dist/cli.mjs')
const workbenchStart = resolve(workspaceRoot, 'server/course-workbench/start.ts')
const workspaceParent = basename(dirname(workspaceRoot)) === '.worktrees'
  ? resolve(workspaceRoot, '../../..')
  : dirname(workspaceRoot)

export function createWindowsTreeKiller(executeFile = execFile) {
  return (pid) => executeFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => undefined)
}

function stopChildProcessTree(child, signal, platform, killProcess, killWindowsTree) {
  if (child.pid === undefined) {
    return
  }

  try {
    if (platform === 'win32') {
      killWindowsTree(child.pid)
    } else {
      killProcess(-child.pid, signal)
    }
  } catch {
    // A child can exit between the supervisor event and the group signal.
  }
}

export function createCourseWorkbenchRunner({
  cwd = workspaceRoot,
  killProcess = process.kill,
  killWindowsTree = createWindowsTreeKiller(),
  platform = process.platform,
  registerSignal = (signal, listener) => process.once(signal, listener),
  spawnProcess = spawn,
} = {}) {
  const children = []
  let shuttingDown = false

  function stop(signal) {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    children.forEach((child) => stopChildProcessTree(child, signal, platform, killProcess, killWindowsTree))
  }

  function waitForChild(child) {
    return new Promise((resolve) => {
      child.once('error', () => {
        stop('SIGTERM')
        resolve(1)
      })
      child.once('exit', (code) => {
        if (!shuttingDown) {
          stop('SIGTERM')
        }
        resolve(code ?? 1)
      })
    })
  }

  return {
    async run() {
      const environment = {
        ...process.env,
        WORKBENCH_ALLOWED_SOURCE_ROOTS:
          process.env.WORKBENCH_ALLOWED_SOURCE_ROOTS
          ?? [workspaceParent, workspaceRoot].join(delimiter),
      }
      const options = { cwd, detached: platform !== 'win32', env: environment, stdio: 'inherit' }
      try {
        children.push(spawnProcess(process.execPath, [tsxCli, 'watch', workbenchStart], options))
        children.push(spawnProcess(process.execPath, [viteCli, '--host', '127.0.0.1'], options))
      } catch {
        stop('SIGTERM')
        return 1
      }
      registerSignal('SIGINT', () => stop('SIGINT'))
      registerSignal('SIGTERM', () => stop('SIGTERM'))

      const exitCodes = await Promise.all(children.map(waitForChild))
      return exitCodes.find((code) => code !== 0) ?? 0
    },
    stop,
  }
}
