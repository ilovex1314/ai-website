# Remotion Course Topic

这一组文档围绕第 9 个 topic “Remotion 课程动画制作台” 展开，涵盖全局计划、工作流、动作库、视觉图、架构分析和 HyperFrames 项目导入协议。

当前实现已经从静态管理台推进为本地组装工具：真实 HyperFrames 项目可被扫描为 scene、元素和内置动画；
后台区与前台口播视频同步预览；平台新增动作可绑定到具体 DOM 元素与帧区间；当前组装结果可直接交给 Remotion
导出 MP4。HyperFrames 内置动画不会被重复生成，编辑器手柄也不会进入成片。

## Read This When

- 你要理解 remotion-course 的整体产品方向。
- 你要看管理台、动作库、导出包和 Codex 自动化的关系。
- 你要跟进视觉图、工作流和架构结论。

## Current Sources

- [Fork 后本地运行指南](../../remotion-course-local-setup.md)
- [全局计划](../../remotion-course-global-plan.md)
- [工作流设计](../../remotion-course-workflow-design.md)
- [动作库管理设计](../../remotion-course-animation-library-management.md)
- [管理端架构分析](../../remotion-course-admin-architecture-analysis.md)
- [管理端架构正式稿](../../remotion-course-admin-architecture-formatted.md)
- [视觉图说明](../../remotion-course-visual-diagrams.md)
- [Overall Workflow](../../remotion-course-overall-workflow.md)

## Keep In Place

- [HyperFrames 项目文件夹导入施工说明](../../remotion-course-hyperframes-project-import-construction.md)

## Current SDD

- [元素动画编辑设计](../../superpowers/specs/2026-07-11-remotion-element-animation-editing-design.md)
- [动作库实时 Demo 设计](../../superpowers/specs/2026-07-12-action-library-live-demo-design.md)
- [动作资产分类与“指向”设计](../../superpowers/specs/2026-07-12-action-taxonomy-pointing-design.md)
