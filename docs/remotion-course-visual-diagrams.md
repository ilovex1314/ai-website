# Remotion 课程动画制作台视觉图说明

## 为什么不用飞书画板作为唯一图源

飞书画板和 Mermaid 很适合表达结构，但默认风格偏点线图。它的优势是可编辑，缺点是视觉层级、配色、重点表达和产品感较弱。

因此本项目采用双图源：

- **image2 视觉图**：用于正式方案文档、README、飞书中主图，强调视觉层级和阅读体验。
- **项目 SVG 图**：作为可维护的矢量备份，用于快速修改结构草稿。
- **飞书画板图**：用于可编辑结构图，方便后续微调节点。

## 已落地图源

| 图 | 文件 | 用途 |
|---|---|---|
| 全局产品架构视觉版 | `docs/assets/remotion-course/product-architecture-image2-final.png` | 正式文档主图，使用 image2 底图 + 精确文字叠加 |
| 系统迭代工作流视觉版 | `docs/assets/remotion-course/workflow-iteration-image2-final.png` | 正式文档主图，使用 image2 底图 + 横向主链路叠加 |
| 剪映/CapCut + Codex 链路视觉版 | `docs/assets/remotion-course/capcut-skill-pipeline-image2-final.png` | 正式文档主图，使用 image2 底图 + 三段式生产链路叠加 |
| 全局产品架构 SVG 版 | `docs/assets/remotion-course/product-architecture.svg` | 可维护的矢量备份 |
| 系统迭代工作流 | `docs/assets/remotion-course/workflow-iteration.svg` | 表达从导入素材到自动化沉淀的闭环 |
| 剪映/CapCut + Codex 链路 | `docs/assets/remotion-course/capcut-skill-pipeline.svg` | 表达自动生成、人工确认、渲染、剪辑交付 |
| 动作库管理模型 | `docs/assets/remotion-course/action-library-management.svg` | 表达动作库的新增、编辑、预览、版本和 timeline 引用 |

## 后续维护规则

1. 正式阅读优先使用 image2 视觉图。
2. HTML 叠字文件是 image2 视觉图的可维护源。
3. SVG 和飞书画板仅作为结构草稿或快速调整版本。
4. 图中文字应和项目术语保持一致。
5. 管理台数据模型变化时，同步更新图和文档。
