import type { CapCutHandoffPackage, CourseProjectPackage } from './workbenchTypes'

type CourseExportPanelProps = {
  projectPackage: CourseProjectPackage
  capcutPackage: CapCutHandoffPackage
}

function packagePreview(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function CourseExportPanel({ projectPackage, capcutPackage }: CourseExportPanelProps) {
  return (
    <>
      <section className="course-card course-card--project-package">
        <div className="course-card__header">
          <p>Project Files</p>
          <span>source of truth</span>
        </div>
        <h2>Project Package</h2>
        <p className="export-note">
          主链路先保存项目工程文件，Remotion、HyperFrames、FFmpeg、剪映交付和 Codex 都读取这份结构化数据。
        </p>
        <pre data-testid="project-package-output">{packagePreview(projectPackage)}</pre>
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
