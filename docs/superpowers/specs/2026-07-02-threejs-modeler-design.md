# Three.js 轻量 3D 建模实验室设计 Spec

## 背景

当前站点已经包含 ECharts 与 Spline 两个 topic。第三个 topic 使用既有 `/topics/threejs` 入口，从“自定义 3D 场景”升级为“轻量 3D 建模实验室”。目标是让中文初学者理解 Three.js 能做什么、核心原理如何运转，并在页面中完成基础建模、模型复用生成大场景、实时 3D 渲染。

## 目标

- 新增一篇中文 Three.js 学习文档，解释能力边界、核心原理、基础使用方式，并把 React Three Fiber / Drei 作为进阶优化方案介绍。
- 新增 `/topics/threejs` 可运行页面，用户第一屏直接进入建模工具，而不是营销页。
- 用户可以添加、选择、删除基础几何体，并编辑位置、旋转、缩放、颜色、金属度、粗糙度。
- 用户可以把当前小模型生成更大的 3D 场景，初版支持 grid、radial、stack 三种生成模式。
- 数据结构必须清晰可持久化；初版只保存在前端 React state 中，不做后端或 localStorage 持久化。
- 代码需要强阅读性：模块职责清晰，命名直接，复杂 Three.js 生命周期或数据转换处使用适当中文注释。
- 使用 SDD 推进：本 spec 作为实现依据；实现计划写入 `docs/superpowers/plans/`。
- 使用 TDD 补测试模块：模型 reducer、生成器、页面集成至少有测试覆盖。

## 非目标

- 不做 Blender 级精细建模。
- 不做材质贴图上传、GLB 导入导出、骨骼动画或物理仿真。
- 不做账号、数据库、多人协作或版本历史。
- 不引入 React Three Fiber 作为初版实现依赖；学习文档中把它作为进阶优化路线。

## 学习文档要求

文件：`docs/threejs-beginner-guide.md`

文档面向中文初学者，结构如下：

1. Three.js 能做什么
   - 产品 3D 展示。
   - 数据可视化。
   - 互动网页体验。
   - 轻量建模与配置器。
   - 游戏和仿真原型。
   - WebXR 入门。
2. Three.js 的核心原理
   - Scene、Camera、Renderer。
   - Mesh = Geometry + Material。
   - Light、Object3D、Render Loop。
   - Raycaster、Controls、Loader。
3. 初学者如何使用
   - 从一个立方体开始。
   - 加相机、灯光、轨道控制。
   - 组合多个几何体。
   - 点击选择和 transform。
   - 抽象成 JSON 数据结构。
4. 初版 demo 的概念映射
   - 建模区、属性面板、数据结构、生成大场景、渲染预览分别对应哪些 Three.js 概念。
5. 进阶优化方案：React Three Fiber + Drei
   - 说明它是 React 场景下的声明式封装。
   - 适合组件化复杂场景、复用 controls、loader、environment。
   - 说明代价：初学者会先学到框架抽象，不如原生 Three.js 直观看见底层机制。
   - 给出迁移策略：保留数据 schema，把 renderer hook 替换成 R3F canvas。

引用资料以官方资料为主：Three.js manual、docs、examples、editor。

## 推荐实现方案

采用“方案 A + 少量方案 D”：

- 方案 A：原生 Three.js 轻量建模器。React 管 UI 和状态；Three.js 管 canvas、scene、camera、renderer、controls、raycaster、mesh。
- 方案 D：程序化大场景生成器。把当前模型当作 prefab，生成 grid、radial、stack 三种实例化布局。

保留方案 B 作为学习文档里的进阶优化，不进入初版依赖。

## 页面结构

- 顶部栏：返回目录、topic 名称、当前对象状态、重置按钮。
- 左侧工具栏：添加 Box / Sphere / Cylinder / Cone / Plane，切换移动 / 旋转 / 缩放。
- 中间主画布：Three.js 建模 canvas，支持 OrbitControls、点击选择、TransformControls。
- 右侧属性面板：对象树、选中对象属性、transform、material、删除对象。
- 下方生成面板：选择生成模式、数量、间距、随机度，展示生成预览 canvas。
- 数据面板：展示当前 `ModelDocument` JSON 摘要，帮助理解后续持久化边界。

## 数据结构

核心数据只保存在 React state，但必须可以直接序列化：

```ts
type ModelDocument = {
  id: string
  name: string
  version: 1
  units: 'meters'
  parts: ModelPart[]
  selectedPartId: string | null
  environment: EnvironmentConfig
}

type ModelPart = {
  id: string
  name: string
  primitive: 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane'
  transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  material: {
    color: string
    metalness: number
    roughness: number
    opacity: number
  }
}

type GeneratedScene = {
  id: string
  sourceModelId: string
  generation: GenerationSettings
  instances: ModelInstance[]
}
```

## 模块划分

- `modelerTypes.ts`：可持久化类型。
- `modelerDefaults.ts`：默认模型、默认生成参数、primitive 默认值。
- `modelerReducer.ts`：添加、选择、更新、删除、重置对象。
- `generatedSceneFactory.ts`：grid / radial / stack 生成逻辑。
- `threeModelFactory.ts`：把数据 schema 转成 Three.js meshes 和 groups。
- `useThreeModelerScene.ts`：主建模 canvas 生命周期。
- `useThreePreviewScene.ts`：生成预览 canvas 生命周期。
- `ThreeModelerPage.tsx`：页面组合。
- `ModelerToolbar.tsx`：建模工具。
- `SceneTree.tsx`：对象树。
- `ObjectInspector.tsx`：属性编辑。
- `GenerationPanel.tsx`：生成参数与预览说明。

## 测试要求

- reducer 测试：添加对象、选择对象、更新 transform/material、删除对象、重置模型。
- generator 测试：grid/radial/stack 生成数量和关键 transform。
- 页面测试：`/topics/threejs` 能渲染建模标题、工具按钮、属性面板、生成面板。
- 现有 App 测试需要覆盖 threejs slug。

## 验收标准

- `/topics/threejs` 渲染真实 Three.js canvas。
- 页面可添加至少 5 种基础几何体。
- 页面可选择对象，并编辑位置、旋转、缩放、颜色、金属度、粗糙度。
- 当前模型可通过 JSON schema 表达。
- 可把当前模型生成 grid、radial、stack 三种大场景。
- 桌面和移动尺寸下 UI 不遮挡、不溢出，canvas 不空白。
- `npm run test` 通过。
- `npm run build` 通过。
