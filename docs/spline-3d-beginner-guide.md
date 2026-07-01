# Spline 3D 零基础概念教学

这份文档配合 `/topics/spline` 页面使用。页面里的 Action 6 灵感模型是原创教学模型：
它参考 DJI Osmo Action 6 官网公开信息来决定“运动相机、镜头、防护、前屏、
快拆底座”这些表达方向，但不使用 DJI 官方 3D 资产、不复刻商标、不照抄精确
工业设计，并在模型上保留 `ORIGINAL DEMO MODEL` 水印。

## 1. Spline 是什么

Spline 可以理解为“面向网页的 3D 设计工具”。你在 Spline 里完成建模、材质、
灯光、相机、交互和动画，然后把场景导出或发布给网页使用。

它和 Three.js 的关系可以这样理解：

- Spline 更像设计工具和场景编辑器，适合快速制作产品展示、3D hero、互动视觉。
- Three.js 更像底层 3D 编程库，适合自定义渲染管线、复杂控制、游戏式逻辑。
- 在网页项目里，Spline 场景通常作为一个资产被 React 页面加载。

## 2. 页面和文档的职责

`/topics/spline` 页面只做产品展示：3D 模型、拖拽旋转、hover 热点、少量规格。
概念教学、数据结构说明、三种嵌入模式解释都放在这份 Markdown 里。

这样做的原因是：真实产品页应该让用户先看产品，而不是先读实现说明。

## 3. 基础数据结构如何拓展

最小结构可以从这三块开始：

```ts
{
  product: {
    id: 'my-product',
    name: '我的产品',
    tagline: '一句话卖点',
    description: '产品简介'
  },
  scene: {
    provider: 'spline',
    embedMode: 'viewer',
    sceneUrl: 'https://prod.spline.design/xxxx/scene.splinecode'
  },
  hotspots: []
}
```

产品展示页需要在这个基础上继续扩展，而不是另起一套结构：

```ts
type ProductShowcase = {
  product: {
    id: string
    name: string
    brand?: string
    tagline: string
    description: string
    disclaimer?: string
  }
  scene: {
    provider: 'spline'
    embedMode: 'viewer' | 'react-spline' | 'iframe' | 'local-css-3d'
    sceneUrl?: string
    localModelUrl?: string
    fallbackPoster?: string
  }
  model: {
    dimensionsMm?: {
      width: number
      height: number
      depth: number
    }
    watermark?: string
    parts: Array<{
      id: string
      label: string
      kind: 'body' | 'lens' | 'screen' | 'button' | 'port' | 'mount' | 'watermark'
      material: string
      position: [number, number, number]
      size: [number, number, number]
      rotation?: [number, number, number]
      radius?: number
      text?: string
    }>
  }
  hotspots: Array<{
    id: string
    partId: string
    label: string
    description: string
    specs: string[]
  }>
  specs: Array<{
    label: string
    value: string
    note?: string
  }>
  sources: Array<{
    label: string
    url: string
  }>
}
```

本项目的本地教学数据在：

```txt
public/models/action-6-inspired/local-model.json
```

本项目还生成了一个可以导入 Spline 的原创 GLB 源资产：

```txt
public/models/action-6-inspired/action-6-inspired-study.glb
```

它不是 `.splinecode`。它的职责是作为 Spline 编辑器的输入资产：

```txt
GLB 源模型 -> 导入 Spline -> 在 Spline 里调材质/灯光/交互 -> 发布或导出 scene.splinecode -> React 页面加载
```

## 4. 官网数据够不够做高精模型

官网数据够做“高质量展示模型的参考”，不够做“工业级精确复刻”。

以 DJI Osmo Action 6 为例，官网和规格页能提供：

- 外形尺寸：`72.8 × 47.2 × 33.1 mm`
- 重量：约 `149 g`
- 传感器：`1/1.1"` CMOS
- 光圈：`f/2.0-f/4.0`
- 视角：`155°`
- 前后屏尺寸、亮度、ppi 等参考信息
- 防水深度等产品卖点

但官网通常不提供：

- CAD 曲面
- 精确倒角半径
- 镜头组件内部层级
- 官方材质贴图、法线贴图、粗糙度贴图
- 可直接导入 Spline 的 GLB/OBJ/FBX/scene 文件

因此本项目的策略是：用公开规格控制比例，用产品类别和卖点控制视觉重点，
再用原创几何、原创配色、水印和替代 UI 避免复刻官方资产。

## 5. sceneUrl 一定要是 Spline 平台链接吗

不一定。

常见有两种：

```ts
sceneUrl: 'https://prod.spline.design/xxx/scene.splinecode'
```

或：

```ts
sceneUrl: '/models/my-product/scene.splinecode'
```

第二种就是本地托管。做法是先在 Spline 导出可被网页加载的 `.splinecode` 文件，
再放进 Vite 的 `public/` 目录，例如：

```txt
public/models/my-product/scene.splinecode
```

然后页面里写：

```tsx
<Spline scene="/models/my-product/scene.splinecode" />
```

注意：本项目当前生成的是教学用 `local-model.json`，不是 Spline 官方导出的
`.splinecode`。它用于演示“一个产品模型数据包应该怎么组织”。当你真的从
Spline 导出 `scene.splinecode` 后，替换到同一路径即可进入真实 Spline runtime。

更准确地说，`scene.splinecode` 不能靠本项目凭空生成。它是 Spline 自己的运行时
场景格式，通常需要在 Spline 平台里创建、导入、编辑后导出或发布。本项目能准备
的是导入 Spline 的源模型、产品结构化数据、热点定义和 React 接入逻辑。

## 6. 三种嵌入模式

### viewer 模式

用 `<spline-viewer>` Web Component 加载场景。

```html
<spline-viewer url="/models/action-6-inspired/scene.splinecode"></spline-viewer>
```

适合：

- 官网 hero
- 产品展示
- 不需要太多 React 状态联动的场景

优点是简单；缺点是深度控制能力不如 React 组件模式。

### react-spline 模式

用 `@splinetool/react-spline` 在 React 里加载场景。

```tsx
import Spline from '@splinetool/react-spline'

export function ProductScene() {
  return <Spline scene="/models/action-6-inspired/scene.splinecode" />
}
```

适合：

- React 页面
- 后续想做对象点击、加载状态、外部按钮触发动画
- 想把产品数据和 3D 场景放在同一个组件边界里

本项目的 `/topics/spline` 把这个模式作为默认 demo，因为它最符合“本地产品数据
+ React 页面”的学习目标。

### iframe 模式

用 Spline 发布页地址作为 iframe。

```html
<iframe
  src="https://my.spline.design/your-product-scene/"
  title="Spline product scene"
></iframe>
```

适合：

- 快速原型
- 嵌入已有公开 Spline 页面
- 不关心页面和 3D 对象深度联动

缺点是控制边界较弱，页面通常很难直接操作 iframe 里的对象状态。

## 7. 从零开始做自己的产品模型

建议准备这些资料：

- 产品三视图或多角度参考图
- 大致尺寸比例，不需要一开始就是 CAD 级
- 材质说明，例如金属、塑料、玻璃、磨砂、透明件
- 关键部件列表，例如镜头、屏幕、按钮、接口、底座
- 哪些卖点必须被看见，例如防水、轻量、散热、可折叠
- 品牌限制，例如能不能用 logo、有没有版权/商标风险

然后按这个流程：

1. 在本项目先写结构化数据：产品信息、规格、部件、sources。
2. 生成或准备授权可用的源模型，例如本项目的 `.glb`。
3. 在 Spline 里导入源模型，继续调材质、灯光、相机和交互状态。
4. 给 Spline 对象命名，尽量和本项目 `parts[].id` 对齐。
5. 导出或发布 Spline 场景。
6. 把 `scene.splinecode` 放到 `public/models/<product>/`，或使用远程 URL。
7. 页面选择 `viewer`、`react-spline` 或 `iframe` 模式加载。

本项目当前 Action 6 灵感案例的具体流程是：

```txt
npm run model:action6
-> public/models/action-6-inspired/action-6-inspired-study.glb
-> Spline Home / Import
-> 导入 GLB 后保存为 Spline 文件
-> Export / Code 或 Publish
-> 得到 scene.splinecode 或 Spline public URL
-> 更新 actionSixInspiredShowcase.scene.sceneUrl
```

## 8. 本项目的 Action 6 灵感案例

本项目不是复刻 DJI 官方模型，而是做一个“运动相机品类”的原创教学模型。

它的 guardrails：

- 不使用 DJI logo。
- 不使用官方 CAD 或模型文件。
- 不复制官方 UI。
- 用 `DEMO CAM` 和 `ORIGINAL DEMO MODEL` 明确标识教学用途。
- 部件设计使用抽象几何和原创配色。

## 9. 参考资料

- DJI Osmo Action 6 官方页：https://www.dji.com/osmo-action-6
- DJI Osmo Action 6 规格页：https://www.dji.com/osmo-action-6/specs
- Spline Viewer 文档：https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer
- Spline Code Export 文档：https://docs.spline.design/exporting-your-scene/web/exporting-as-code
- React Spline：https://github.com/splinetool/react-spline
- Spline Community：https://app.spline.design/community
