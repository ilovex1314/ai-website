import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { createCourseWorkbenchRunner, createWindowsTreeKiller } from './course-workbench-runner.mjs'

class FakeChild extends EventEmitter {
  constructor(pid) {
    super()
    this.pid = pid
  }
}

describe('Course Workbench runner', () => {
  it('builds a Windows tree killer with taskkill subtree arguments', () => {
    const executeFile = vi.fn()

    createWindowsTreeKiller(executeFile)(4001)

    expect(executeFile).toHaveBeenCalledWith('taskkill', ['/PID', '4001', '/T', '/F'], expect.any(Function))
  })

  it('starts direct local binaries in detached groups and terminates both process trees', async () => {
    const firstChild = new FakeChild(4101)
    const secondChild = new FakeChild(4102)
    const children = [firstChild, secondChild]
    const spawnProcess = vi.fn(() => children.shift())
    const killProcess = vi.fn()
    const signalListeners = {}
    const runner = createCourseWorkbenchRunner({
      cwd: '/workspace',
      killProcess,
      platform: 'darwin',
      registerSignal: (signal, listener) => {
        signalListeners[signal] = listener
      },
      spawnProcess,
    })
    const result = runner.run()

    expect(spawnProcess).toHaveBeenCalledTimes(2)
    expect(spawnProcess.mock.calls[0][2]).toMatchObject({ detached: true, stdio: 'inherit' })
    expect(spawnProcess.mock.calls[1][2]).toMatchObject({ detached: true, stdio: 'inherit' })

    signalListeners.SIGINT()
    expect(killProcess).toHaveBeenCalledWith(-4101, 'SIGINT')
    expect(killProcess).toHaveBeenCalledWith(-4102, 'SIGINT')
    firstChild.emit('exit', 0)
    secondChild.emit('exit', 0)
    await expect(result).resolves.toBe(0)
  })

  it('terminates the remaining process tree when spawning a child fails', async () => {
    const firstChild = new FakeChild(4201)
    const secondChild = new FakeChild(4202)
    const spawnProcess = vi.fn().mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild)
    const killProcess = vi.fn()
    const runner = createCourseWorkbenchRunner({
      cwd: '/workspace',
      killProcess,
      platform: 'darwin',
      registerSignal: vi.fn(),
      spawnProcess,
    })
    const result = runner.run()

    firstChild.emit('error', new Error('spawn failed'))
    secondChild.emit('exit', 0)

    await expect(result).resolves.toBe(1)
    expect(killProcess).toHaveBeenCalledWith(-4201, 'SIGTERM')
    expect(killProcess).toHaveBeenCalledWith(-4202, 'SIGTERM')
  })

  it('terminates an already-started process tree when spawn throws synchronously', async () => {
    const firstChild = new FakeChild(4301)
    const spawnProcess = vi.fn().mockReturnValueOnce(firstChild).mockImplementationOnce(() => {
      throw new Error('spawn threw')
    })
    const killProcess = vi.fn()
    const runner = createCourseWorkbenchRunner({
      cwd: '/workspace',
      killProcess,
      platform: 'darwin',
      registerSignal: vi.fn(),
      spawnProcess,
    })

    await expect(runner.run()).resolves.toBe(1)
    expect(killProcess).toHaveBeenCalledWith(-4301, 'SIGTERM')
  })

  it('uses the injected Windows tree-kill helper for every child process', async () => {
    const firstChild = new FakeChild(4401)
    const secondChild = new FakeChild(4402)
    const children = [firstChild, secondChild]
    const killWindowsTree = vi.fn()
    const runner = createCourseWorkbenchRunner({
      cwd: '/workspace',
      killWindowsTree,
      platform: 'win32',
      registerSignal: vi.fn(),
      spawnProcess: vi.fn(() => children.shift()),
    })
    const result = runner.run()

    runner.stop('SIGTERM')

    expect(killWindowsTree).toHaveBeenCalledWith(4401)
    expect(killWindowsTree).toHaveBeenCalledWith(4402)
    firstChild.emit('exit', 0)
    secondChild.emit('exit', 0)
    await expect(result).resolves.toBe(0)
  })
})
