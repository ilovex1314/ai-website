import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CourseProjectIntake,
  type CourseProjectIntakeApi,
  type CourseProjectIntakeResult,
} from './CourseProjectIntake'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const migrationRequired: CourseProjectIntakeResult = {
  status: 'migration-required',
  migrationReport: {
    summary: { recognized: 4, needsMetadata: 7, unresolved: 0 },
    applied: false,
  },
}

const ready: CourseProjectIntakeResult = {
  status: 'ready',
  project: { id: 'course-01' },
  migrationReport: {
    summary: { recognized: 4, needsMetadata: 7, unresolved: 0 },
    applied: true,
  },
}

afterEach(cleanup)

describe('CourseProjectIntake', () => {
  it('moves from idle through scanning, migration-required, applying and ready', async () => {
    const user = userEvent.setup()
    const scan = deferred<CourseProjectIntakeResult>()
    const apply = deferred<CourseProjectIntakeResult>()
    const api: CourseProjectIntakeApi = {
      importHyperframes: vi
        .fn()
        .mockReturnValueOnce(scan.promise)
        .mockReturnValueOnce(apply.promise),
      uploadForeground: vi.fn(),
    }
    render(
      <CourseProjectIntake
        api={api}
        projectPath="/allowed/course"
        durationLabel="158s · 4740f"
        foregroundName="speaker.mp4"
        foregroundPath="/allowed/speaker.mp4"
        structure={{ scenes: 11, elements: 58, animations: 0 }}
      />,
    )

    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'idle')
    await user.click(screen.getByRole('button', { name: '导入 HyperFrames 文件夹' }))
    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'scanning')
    expect(screen.getByText('正在扫描项目')).toBeInTheDocument()

    scan.resolve(migrationRequired)
    expect(await screen.findByText('需要补全项目元数据')).toBeInTheDocument()
    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'migration-required')
    expect(screen.getByText('已识别 4')).toBeInTheDocument()
    expect(screen.getByText('待补全 7')).toBeInTheDocument()
    expect(screen.getByText('未解决 0')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '补全项目元数据' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: '补全项目元数据' }))
    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'applying')
    expect(screen.getByText('正在应用项目元数据')).toBeInTheDocument()

    apply.resolve(ready)
    expect(await screen.findByText('项目已就绪')).toBeInTheDocument()
    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'ready')
    expect(api.importHyperframes).toHaveBeenNthCalledWith(1, '/allowed/course', false)
    expect(api.importHyperframes).toHaveBeenNthCalledWith(2, '/allowed/course', true)
    expect(screen.queryByRole('button', { name: '补全项目元数据' })).not.toBeInTheDocument()
  })

  it('shows a structured error and recovery action', async () => {
    const user = userEvent.setup()
    const api: CourseProjectIntakeApi = {
      importHyperframes: vi.fn().mockRejectedValue({
        body: {
          message: 'Source contract is invalid',
          recovery: 'Run the source validator.',
        },
      }),
      uploadForeground: vi.fn(),
    }
    render(
      <CourseProjectIntake
        api={api}
        projectPath="/allowed/course"
        durationLabel="158s · 4740f"
        foregroundName="speaker.mp4"
        foregroundPath="/allowed/speaker.mp4"
        structure={{ scenes: 11, elements: 58, animations: 0 }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '导入 HyperFrames 文件夹' }))
    expect(await screen.findByText('Source contract is invalid')).toBeInTheDocument()
    expect(screen.getByText('Run the source validator.')).toBeInTheDocument()
    expect(screen.getByTestId('course-project-intake')).toHaveAttribute('data-state', 'error')
  })

  it('uploads the selected foreground file only after the project is ready', async () => {
    const user = userEvent.setup()
    const api: CourseProjectIntakeApi = {
      importHyperframes: vi.fn().mockResolvedValue(ready),
      uploadForeground: vi.fn().mockResolvedValue({
        foreground: {
          relativePath: 'sources/foreground/speaker.mp4',
          metadata: { durationSeconds: 12, hasAudio: true },
        },
      }),
    }
    render(
      <CourseProjectIntake
        api={api}
        projectPath="/allowed/course"
        durationLabel="158s · 4740f"
        foregroundName="speaker.mp4"
        foregroundPath="/allowed/speaker.mp4"
        structure={{ scenes: 11, elements: 58, animations: 0 }}
      />,
    )

    const fileInput = screen.getByLabelText('选择口播视频')
    expect(fileInput).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '导入 HyperFrames 文件夹' }))
    expect(await screen.findByText('项目已就绪')).toBeInTheDocument()
    expect(fileInput).toBeEnabled()

    const file = new File(['video'], 'speaker.mp4', { type: 'video/mp4' })
    await user.upload(fileInput, file)
    expect(api.uploadForeground).toHaveBeenCalledWith('course-01', file)
    expect(await screen.findByText('口播视频已上传')).toBeInTheDocument()
  })
})
