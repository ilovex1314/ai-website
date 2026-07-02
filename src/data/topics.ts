export type Topic = {
  slug: string
  title: string
  tool: string
  category: 'charts' | '3d' | 'shader' | 'effects' | 'physics' | 'animation' | 'maps'
  summary: string
  demoGoal: string
  plannedInteractions: string[]
  acceptanceCriteria: string[]
  references: string[]
}

export const topics: Topic[] = [
  {
    slug: 'echarts',
    title: 'ECharts 互动图表',
    tool: 'Apache ECharts',
    category: 'charts',
    summary:
      '用 ECharts 搭建富途风格行情图，覆盖时间区间切换、悬停交易明细、涨跌配色、成交量柱、拖拽平移和 reback 复位。',
    demoGoal:
      '搭建一个纳斯达克风格的互动价格折线图，让用户切换时间范围、悬停查看交易字段，并拖动非分时窗口。',
    plannedInteractions: [
      'Switch between 分时, 5日, 日K, 周K, 月K, 季K, and 年K ranges.',
      '悬停查看时间、价格、涨跌额、涨跌幅、成交量和成交额。',
      '横向拖动非分时窗口，并通过 reback 恢复上一个视图。',
    ],
    acceptanceCriteria: [
      '案例在 React 页面中渲染真实的 ECharts 实例。',
      '区间按钮会更新可见数据窗口，并清空拖拽偏移。',
      '图表在桌面和移动端宽度下都保持响应式布局。',
    ],
    references: ['https://echarts.apache.org/examples/en/index.html'],
  },
  {
    slug: 'spline',
    title: 'Spline 3D 嵌入',
    tool: 'Spline',
    category: '3d',
    summary:
      '用 Spline 处理更适合从社区场景复用的精致 3D 资产，避免从代码里完全重建复杂模型。',
    demoGoal:
      '创建一个幻灯片式页面，嵌入 Spline 场景，并围绕 remix、导出和 iframe 集成补齐控制与说明。',
    plannedInteractions: [
      '在配置嵌入 URL 前渲染安全占位状态。',
      '标注 Spline iframe 代码片段应该放置的位置。',
      '添加一个演示框架，后续可承载实时社区 remix。',
    ],
    acceptanceCriteria: [
      '页面支持基于 iframe 的 Spline 嵌入路径。',
      '缺少嵌入时，fallback 状态能解释原因且不破坏布局。',
      '嵌入容器使用稳定的 aspect-ratio 尺寸。',
    ],
    references: ['https://spline.design/', 'https://app.spline.design/community'],
  },
  {
    slug: 'threejs',
    title: 'Three.js 自定义 3D 场景',
    tool: 'Three.js',
    category: '3d',
    summary:
      '当 3D 行为足够具体、适合直接编码时使用 Three.js，比如相机运动、鼠标驱动旋转、着色器、灯光和物体状态变化。',
    demoGoal:
      '搭建一个可响应鼠标位置的金属立方体和动态渐变场景，可作为 PPT 背景素材，并验证自定义 3D 交互的可控性。',
    plannedInteractions: [
      '渲染全出血 WebGL 画布。',
      '根据指针移动旋转前景几何体。',
      '为测试和无障碍场景提供暂停或弱化动效能力。',
    ],
    acceptanceCriteria: [
      '场景在 canvas 中渲染出非空像素。',
      '指针移动会改变相机或物体朝向。',
      '画布在移动端和桌面端尺寸下构图正确。',
    ],
    references: ['https://threejs.org/'],
  },
  {
    slug: 'shadertoy',
    title: 'Shadertoy 着色器改编',
    tool: 'Shadertoy GLSL',
    category: 'shader',
    summary:
      '把 Shadertoy 作为成熟着色器创意来源，再将 GLSL 移植或简化到 React/WebGL 画布中，形成可控案例。',
    demoGoal:
      '创建一个着色器背景案例，提供颜色、强度和速度等可编辑 uniforms，方便测试 prompt 驱动的视觉变化。',
    plannedInteractions: [
      '提供一个轻量 shader runtime 包装。',
      '把 uniform 控制暴露为 React 状态。',
      '在引入更重的社区代码前，先保留一个轻量示例 shader。',
    ],
    acceptanceCriteria: [
      'shader 能在 canvas 中渲染，且没有外部运行时错误。',
      'uniform 控制会明显改变输出画面。',
      '实现中记录 Shadertoy tabs/channels 的移植约束。',
    ],
    references: ['https://www.shadertoy.com/browse'],
  },
  {
    slug: 'unicorn',
    title: 'Unicorn Studio 特效嵌入',
    tool: 'Unicorn Studio',
    category: 'effects',
    summary:
      '当最快路径是 remix 现成交互特效并嵌入 HTML 片段时，用 Unicorn Studio 生产 no-code WebGL 动效资产。',
    demoGoal:
      '搭建一个特效展示页，可承载导出的 Unicorn HTML，并与本地 fallback 动态背景对比。',
    plannedInteractions: [
      '渲染一个可直接承载片段的嵌入容器。',
      '嵌入缺失时展示本地 fallback 动效。',
      '记录 HTML 嵌入交付所需的导出说明。',
    ],
    acceptanceCriteria: [
      '嵌入容器与页面其他 UI 保持隔离。',
      'fallback 能体现目标动效方向。',
      '页面记录导出的 HTML 应粘贴到哪里。',
    ],
    references: ['https://www.unicorn.studio/'],
  },
  {
    slug: 'matterjs',
    title: 'Matter.js 物理实验室',
    tool: 'Matter.js',
    category: 'physics',
    summary:
      '用 Matter.js 制作 2D 刚体物理案例，例如自由落体、碰撞、重力、约束和教学幻灯片里的可拖拽物体。',
    demoGoal:
      '搭建一个物理教学页面，包含自由落体和小球碰撞实验，并允许用户直接操作来改变动画轨迹。',
    plannedInteractions: [
      '从自由落体场景开始。',
      '添加可拖拽的碰撞物体。',
      '暴露重置、重力和暂停控制。',
    ],
    acceptanceCriteria: [
      '案例在 React 生命周期边界内运行 Matter.js 引擎。',
      '用户至少能拖动一个物体，并改变模拟结果。',
      '重置会把场景恢复到确定性的初始状态。',
    ],
    references: ['https://brm.io/matter-js/'],
  },
  {
    slug: 'rive',
    title: 'Rive 互动 2D 动画',
    tool: 'Rive',
    category: 'animation',
    summary:
      '用 Rive 制作带状态机的互动 2D 动画资产，尤其适合手写 SVG/CSS 更慢且表现力不足的场景。',
    demoGoal:
      '创建一个幻灯片面板，加载 Rive 资产并自动播放，后续可让 topic 状态驱动动画输入。',
    plannedInteractions: [
      '加载本地或远程 .riv 文件。',
      '自动播放默认动画。',
      '把 React 控制映射到状态机输入。',
    ],
    acceptanceCriteria: [
      '页面具备清晰的资产加载边界。',
      '动画运行不会阻塞其他 UI。',
      '控制项已为状态机输入做好准备。',
    ],
    references: ['https://rive.app/marketplace/'],
  },
  {
    slug: 'mapbox',
    title: 'Mapbox 互动地图',
    tool: 'Mapbox GL JS',
    category: 'maps',
    summary:
      '当地理、路线、区域或位置数据需要演示级交互时，用 Mapbox 构建可拖拽、可缩放、可换样式的地图体验。',
    demoGoal:
      '搭建一个地图幻灯片，包含 token 感知初始化、示例路线或区域覆盖层，以及浅色、深色、卫星风格切换。',
    plannedInteractions: [
      '通过环境 token 检查控制实时地图启用。',
      '渲染示例标记和路线数据。',
      '通过 React 控制切换地图样式。',
    ],
    acceptanceCriteria: [
      '页面能优雅处理缺少 Mapbox token 的情况。',
      '配置 token 后可渲染互动地图表面。',
      '样式切换不会重新挂载整个应用外壳。',
    ],
    references: ['https://docs.mapbox.com/mapbox-gl-js/guides/'],
  },
]

export function getTopicBySlug(slug: string) {
  return topics.find((topic) => topic.slug === slug)
}
