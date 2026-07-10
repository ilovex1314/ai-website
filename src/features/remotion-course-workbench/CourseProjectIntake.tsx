import { useRef, useState } from 'react'

type MigrationSummary = {
  recognized: number
  needsMetadata: number
  unresolved: number
}

type MigrationReport = {
  summary: MigrationSummary
  applied: boolean
}

export type CourseProjectIntakeResult =
  | {
      status: 'migration-required'
      migrationReport: MigrationReport
    }
  | {
      status: 'unresolved'
      migrationReport: MigrationReport
    }
  | {
      status: 'ready'
      project: { id: string }
      migrationReport: MigrationReport
    }

type ForegroundUploadResult = {
  foreground: {
    relativePath: string
    metadata: {
      durationSeconds: number
      hasAudio: boolean
    }
  }
}

export type CourseProjectIntakeApi = {
  importHyperframes(sourcePath: string, applyMetadata: boolean): Promise<CourseProjectIntakeResult>
  uploadForeground(projectId: string, file: File): Promise<ForegroundUploadResult>
}

type IntakeState = 'idle' | 'scanning' | 'migration-required' | 'applying' | 'ready' | 'error'

type CourseProjectIntakeProps = {
  projectPath: string
  durationLabel: string
  foregroundName: string
  foregroundPath: string
  structure: {
    scenes: number
    elements: number
    animations: number
    missingActions?: number
  }
  backgroundAudioPolicy?: string
  foregroundAudioPolicy?: string
  api?: CourseProjectIntakeApi
}

type IntakeError = {
  message: string
  recovery: string
}

async function responseBody<T>(response: Response): Promise<T> {
  const value = await response.json()

  if (!response.ok) {
    const error = new Error('Workbench request failed') as Error & { body?: unknown }
    error.body = value
    throw error
  }

  return value as T
}

const defaultApi: CourseProjectIntakeApi = {
  async importHyperframes(sourcePath, applyMetadata) {
    const response = await fetch('/api/imports/hyperframes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourcePath, applyMetadata }),
    })
    return responseBody<CourseProjectIntakeResult>(response)
  },

  async uploadForeground(projectId, file) {
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/foreground`, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name),
      },
      body: file,
    })
    return responseBody<ForegroundUploadResult>(response)
  },
}

function intakeError(error: unknown): IntakeError {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (error as { body?: unknown }).body

    if (typeof body === 'object' && body !== null) {
      const message = 'message' in body && typeof body.message === 'string' ? body.message : '项目处理失败'
      const recovery = 'recovery' in body && typeof body.recovery === 'string' ? body.recovery : '请检查本地服务后重试。'
      return { message, recovery }
    }
  }

  return {
    message: error instanceof Error ? error.message : '项目处理失败',
    recovery: '请检查本地服务、允许的素材目录和源文件后重试。',
  }
}

const stateLabels: Record<IntakeState, string> = {
  idle: '等待扫描',
  scanning: '正在扫描项目',
  'migration-required': '需要补全项目元数据',
  applying: '正在应用项目元数据',
  ready: '项目已就绪',
  error: '项目处理失败',
}

const headerStateLabels: Record<IntakeState, string> = {
  idle: '未导入',
  scanning: '处理中',
  'migration-required': '待确认',
  applying: '处理中',
  ready: '已就绪',
  error: '失败',
}

export function CourseProjectIntake({
  projectPath,
  durationLabel,
  foregroundName,
  foregroundPath,
  structure,
  backgroundAudioPolicy = 'muted',
  foregroundAudioPolicy = 'primary',
  api = defaultApi,
}: CourseProjectIntakeProps) {
  const [state, setState] = useState<IntakeState>('idle')
  const [summary, setSummary] = useState<MigrationSummary>({
    recognized: structure.elements,
    needsMetadata: 0,
    unresolved: 0,
  })
  const [projectId, setProjectId] = useState<string>()
  const [error, setError] = useState<IntakeError>()
  const [uploadStatus, setUploadStatus] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)

  const importProject = async (applyMetadata: boolean) => {
    setState(applyMetadata ? 'applying' : 'scanning')
    setError(undefined)

    try {
      const result = await api.importHyperframes(projectPath, applyMetadata)
      setSummary(result.migrationReport.summary)

      if (result.status === 'migration-required') {
        setState('migration-required')
        return
      }

      if (result.status === 'unresolved') {
        setError({
          message: '存在无法自动识别的项目结构',
          recovery: '请先为无法识别的场景和元素补充稳定声明，再重新扫描。',
        })
        setState('error')
        return
      }

      setProjectId(result.project.id)
      setState('ready')
    } catch (nextError) {
      setError(intakeError(nextError))
      setState('error')
    }
  }

  const uploadForeground = async (file: File) => {
    if (projectId === undefined) {
      return
    }

    setUploadStatus('正在上传口播视频')

    try {
      await api.uploadForeground(projectId, file)
      setUploadStatus('口播视频已上传')
    } catch (nextError) {
      setError(intakeError(nextError))
      setUploadStatus(undefined)
      setState('error')
    }
  }

  return (
    <section
      className="course-card course-card--media-intake"
      data-state={state}
      data-testid="course-project-intake"
    >
      <div className="course-card__header">
        <p>Intake</p>
        <span>{headerStateLabels[state]}</span>
      </div>
      <h2>Media Intake</h2>
      <div className="media-intake-grid">
        <div className="media-intake-card">
          <small>后台区</small>
          <strong>HyperFrames Project</strong>
          <span>{projectPath}</span>
          <span data-testid="case-duration">{durationLabel}</span>
          <button
            type="button"
            disabled={state === 'scanning' || state === 'applying'}
            onClick={() => void importProject(false)}
          >
            导入 HyperFrames 文件夹
          </button>
          <em>audio: {backgroundAudioPolicy}</em>
        </div>
        <div className="media-intake-card">
          <small>前台区</small>
          <strong>{foregroundName}</strong>
          <span>{foregroundPath}</span>
          <button
            type="button"
            disabled={state !== 'ready'}
            onClick={() => fileInput.current?.click()}
          >
            上传口播视频
          </button>
          <input
            ref={fileInput}
            aria-label="选择口播视频"
            accept="video/*"
            disabled={state !== 'ready'}
            hidden
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file !== undefined) {
                void uploadForeground(file)
              }

              event.target.value = ''
            }}
          />
          <em>audio: {foregroundAudioPolicy}</em>
          {uploadStatus ? <span role="status">{uploadStatus}</span> : null}
        </div>
        <div className="media-structure-status" aria-label="HyperFrames 结构化状态">
          <span>{structure.scenes} scenes parsed</span>
          <span>{structure.elements} elements parsed</span>
          <span>{structure.animations} animations detected</span>
          <span>{structure.missingActions ?? 0} missing actions created</span>
          <span>已识别 {summary.recognized}</span>
          <span>待补全 {summary.needsMetadata}</span>
          <span>未解决 {summary.unresolved}</span>
        </div>
        <div className="media-structure-status" role="status">
          <strong>{stateLabels[state]}</strong>
          {state === 'migration-required' ? (
            <button type="button" onClick={() => void importProject(true)}>
              补全项目元数据
            </button>
          ) : null}
          {error ? (
            <>
              <span>{error.message}</span>
              <span>{error.recovery}</span>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
