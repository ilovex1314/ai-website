import { useMemo, useState } from 'react'
import { WorkbenchClient, WorkbenchClientError, type WorkbenchRenderResult } from './api/workbenchClient'
import type { CourseProjectV2 } from './domain/courseProjectSchema'
import type { CapCutHandoffPackage, CourseAssemblyManifest } from './workbenchTypes'

type CourseExportPanelProps = {
  assemblyManifest: CourseAssemblyManifest
  capcutPackage: CapCutHandoffPackage
  project: CourseProjectV2
}

function packagePreview(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function CourseExportPanel({ assemblyManifest, capcutPackage, project }: CourseExportPanelProps) {
  const client = useMemo(() => new WorkbenchClient(), [])
  const [rendering, setRendering] = useState(false)
  const [result, setResult] = useState<WorkbenchRenderResult>()
  const [error, setError] = useState<string>()

  const renderProject = async () => {
    setRendering(true)
    setError(undefined)

    try {
      setResult(await client.renderProject(project, project.activeAspectRatio))
    } catch (caught) {
      setError(caught instanceof WorkbenchClientError
        ? `${caught.message} ${caught.body.recovery}`
        : '导出失败，请确认本地 Course Workbench Service 已启动。')
    } finally {
      setRendering(false)
    }
  }

  return (
    <>
      <section className="course-card course-card--project-package">
        <div className="course-card__header">
          <p>Assembly State</p>
          <span>assembly-only</span>
        </div>
        <h2>Assembly Manifest</h2>
        <p className="export-note">
          只保存当前组装台状态：输入源、元素图、动作库、timeline、前台窗口和 handoff，不承包上游生产链路。
        </p>
        <div className="course-export-actions">
          <button
            className="course-button course-button--primary"
            disabled={rendering}
            onClick={() => void renderProject()}
            type="button"
          >
            {rendering ? '正在导出…' : '导出 MP4'}
          </button>
          <span aria-live="polite">{rendering ? 'Remotion 正在逐帧渲染' : result ? '导出完成' : '尚未导出'}</span>
          {result ? <a className="course-link-button" href={result.mediaUrl} target="_blank" rel="noreferrer">打开成片</a> : null}
        </div>
        {error ? <p className="course-export-error" role="alert">{error}</p> : null}
        {result ? (
          <video className="course-export-preview" controls preload="metadata" src={result.mediaUrl} />
        ) : null}
        <pre data-testid="assembly-manifest-output">{packagePreview(assemblyManifest)}</pre>
      </section>

      <section className="course-card course-card--capcut-package">
        <div className="course-card__header">
          <p>Editing Package</p>
          <span>CapCut ready</span>
        </div>
        <h2>CapCut Handoff</h2>
        <p className="export-note">
          输出 master、clean PPT、speaker、overlay、字幕、timeline.csv 和 edit-guide.md，方便剪映二次包装。
        </p>
        <pre data-testid="capcut-package-output">{packagePreview(capcutPackage)}</pre>
      </section>
    </>
  )
}
