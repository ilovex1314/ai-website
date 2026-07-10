import type { CapCutHandoffPackage, CourseAssemblyManifest } from './workbenchTypes'

type CourseExportPanelProps = {
  assemblyManifest: CourseAssemblyManifest
  capcutPackage: CapCutHandoffPackage
}

function packagePreview(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function CourseExportPanel({ assemblyManifest, capcutPackage }: CourseExportPanelProps) {
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
