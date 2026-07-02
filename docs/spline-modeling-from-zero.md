# Spline 从 0 开始建模教学

这份文档回答一个核心问题：如果目标是用 Spline 做一个接近真实产品的 3D 展示，数据应该怎么来，什么时候能复用社区资源，什么时候必须建模。

## 1. 先判断你的方案是否可行

你前面提到的方案是：

> 从社区找到 Action 6 的 Spline 数据，或者找到其他能转成 Spline 数据的数据。

这个方向是对的，但要拆成三种可行性等级。

### A. 直接找到 Spline 社区 scene

这是最理想的情况：

```txt
Spline Community scene
-> Remix / Duplicate
-> 调整对象命名、相机、材质、交互
-> Publish / Export
-> React 页面接入
```

优点是最快，能保留 Spline 的材质、灯光、动画和事件。

问题是：高度依赖社区是否刚好有人做过同款产品。像 DJI Osmo Action 6 这种具体消费电子产品，直接找到同款 Spline scene 的概率不高；即便找到了，也要确认授权、是否可商用、是否允许 remix。

适合：

- 学习 Spline 嵌入和交互。
- 快速做视觉 demo。
- 对“完全还原某个真实产品”没有强要求。

不适合：

- 精准还原具体商品。
- 要上线商用。
- 要保证模型来源合规。

### B. 找到 GLB / OBJ / FBX 模型，再导入 Spline

这是最现实的路线：

```txt
授权 3D 模型文件
-> 导入 Spline
-> 清理层级
-> 重新命名对象
-> 设材质、灯光、相机
-> 加 hover/click/展开动画
-> Publish / Export
-> React 页面加载
```

Spline 可以作为场景编辑器使用，但它不是所有建模问题的终点。复杂产品通常先在 Blender、Fusion 360、C4D、Rhino、SolidWorks 等工具里建好，再以 GLB/OBJ/FBX 等格式进入 Spline。

适合：

- 已经有产品 3D 模型。
- 从模型市场买到授权资产。
- 从设计团队拿到 CAD/STEP/FBX/GLB。
- 希望在 Spline 里主要做网页交互和展示包装。

风险：

- 模型格式可能不带好材质，需要重设。
- CAD 模型面数可能过高，需要减面。
- 产品品牌模型可能涉及版权、商标、外观专利。
- 免费模型经常授权不清晰，不适合商用。

### C. 在 Spline 里从 0 手动建模

这是学习 Spline 最扎实的路线，但不适合一开始就追求“精准复刻 Action 6”。

```txt
参考图 / 尺寸 / 产品结构
-> Spline 基础几何体搭形
-> 细化倒角、镜头、屏幕、按键、接口
-> 材质和灯光
-> 交互状态
-> 发布接入
```

适合：

- 学 Spline 基础能力。
- 做原创产品展示。
- 做低中精度 demo。
- 没有现成 3D 模型时快速表达结构。

不适合：

- 要精准还原复杂工业设计。
- 要复制真实产品的细节、公差、曲面、纹理。
- 对模型精度要求很高。

## 2. 我对 Action 6 案例的判断

如果目标是“学习 Spline”，推荐路线是：

```txt
先用原创近似模型学习完整流程
再用授权 GLB/OBJ 模型练习导入流程
最后才做高精度产品还原
```

如果目标是“精准还原 DJI Osmo Action 6”，推荐路线是：

```txt
授权模型 / 自建 Blender 模型 / 产品团队源文件
-> 导入 Spline
-> Spline 做展示、交互、发布
```

不推荐直接在 Spline 里用基础盒子拼一个“精准 Action 6”。原因不是 Spline 不能建模，而是 Action camera 的真实外观包含大量专业建模内容：

- 机身四角倒角和曲面过渡。
- 镜头外圈的多层结构。
- 玻璃、塑料、橡胶、金属的不同材质。
- 屏幕反射和 UI 贴图。
- 机身接口门、卡扣、螺丝、麦克风孔。
- 尺寸比例和微小细节。

这些内容用 Spline 可以表达，但要做到“精准”，本质上已经进入专业 3D 建模范畴。

## 3. 一个 Spline 产品展示需要哪些数据

建议把产品数据分成五层。

```ts
type ProductShowcase = {
  product: ProductInfo
  scene: SplineSceneConfig
  model: ModelStructure
  hotspots: Hotspot[]
  specs: ProductSpec[]
  sources: Source[]
}
```

### product

描述产品是什么。

```ts
type ProductInfo = {
  id: string
  name: string
  brand?: string
  tagline: string
  description: string
  disclaimer?: string
}
```

### scene

描述 Spline 场景怎么加载。

```ts
type SplineSceneConfig = {
  provider: 'spline'
  embedMode: 'viewer' | 'react-spline' | 'iframe'
  sceneUrl: string
  localModelUrl?: string
  sourceAsset?: {
    format: 'glb' | 'obj' | 'fbx' | 'blend' | 'step'
    url: string
    purpose: string
  }
}
```

说明：

- `sceneUrl` 是真正给网页加载的 Spline 场景地址。
- `sourceAsset` 是给 Spline 编辑器导入的源模型，不等于可直接运行的 `.splinecode`。
- `.splinecode` 通常要从 Spline 编辑器发布或导出得到。

### model

描述模型内部结构，方便做热点、展开、说明。

```ts
type ModelStructure = {
  dimensionsMm?: {
    width: number
    height: number
    depth: number
  }
  parts: ModelPart[]
}

type ModelPart = {
  id: string
  label: string
  kind: 'body' | 'lens' | 'screen' | 'button' | 'port' | 'mount'
  splineObjectName: string
  material?: string
}
```

关键点：`splineObjectName` 要和 Spline 里的对象命名一致。这样 React 页面才知道用户点击的是哪个模块。

推荐命名：

```txt
body_shell
lens_outer_ring
lens_glass
front_screen
rear_screen
top_record_button
side_door
mount_adapter
watermark_original_demo
```

### hotspots

描述用户 hover/click 后看到什么。

```ts
type Hotspot = {
  id: string
  partId: string
  label: string
  description: string
  specs: string[]
}
```

### sources

记录来源，避免后续忘记资产和参考从哪来。

```ts
type Source = {
  label: string
  url: string
  license?: string
  usage?: 'reference' | 'source-asset' | 'runtime-scene'
}
```

## 4. Spline 的核心概念

### File

一个 Spline 文件，相当于一个项目。

### Scene

文件里的一个场景。免费账号可能限制可创建的 scene 数量。

### Object

场景里的对象，可以是基础几何体、导入模型、灯光、相机、文字等。

### Material

材质控制颜色、粗糙度、金属感、透明度、贴图等。产品展示里材质非常关键。

### Camera

决定发布后用户第一眼看到什么。很多 Spline demo 看起来“不对”，本质是相机没有调好。

### Event

交互事件，例如 hover、click、drag、mouse move。

### State

对象状态，例如 assembled、lens_expanded、screen_expanded。状态配合事件可以做展开动画。

### Publish / Export

把 Spline 文件变成网页能加载的资源：

- iframe：嵌入 Spline 发布页。
- viewer：用 `<spline-viewer>` 加载场景。
- React：用 `@splinetool/react-spline` 加载场景。
- code export：导出代码或 `.splinecode`，取决于账号和功能入口。

## 5. 从 0 做一个产品模型的流程

### 第一步：收集参考

至少准备：

- 正面图。
- 背面图。
- 侧面图。
- 顶部图。
- 尺寸数据。
- 材质参考。
- 关键卖点。

对于真实商品，只把图片当参考，不要直接复制商标、官方 UI、受保护图案。

### 第二步：拆结构

以运动相机为例：

```txt
body_shell
front_faceplate
lens_outer_ring
lens_inner_glass
front_screen
rear_screen
top_button
side_door
bottom_mount
watermark_original_demo
```

不要一上来追求细节。先把大体比例搭对。

### 第三步：搭基础体块

在 Spline 里用基础对象搭形：

- Rounded Cube 做机身。
- Cylinder 做镜头环。
- Plane / Rectangle 做屏幕。
- Small Cube / Rounded Cube 做按钮。
- Thin Cubes 做接口门和底座。

先完成 silhouette，也就是远看像不像。

### 第四步：做材质

产品展示通常至少需要：

- 机身：深灰磨砂材质。
- 镜头环：半金属或阳极氧化材质。
- 镜头玻璃：深色透明、带一点蓝绿色反光。
- 屏幕：黑色玻璃、高反射。
- 按键：橙色或红色软胶。
- 水印：明显但不干扰展示。

### 第五步：调灯光

基础组合：

```txt
Key Light    主光，决定形体
Fill Light   补光，避免全黑
Rim Light    轮廓光，让产品从背景里分出来
Ambient      环境光，控制整体亮度
```

不要只靠一个灯。产品会显得很平或者很脏。

### 第六步：调相机

相机要先服务产品展示，不要追求奇怪角度。

推荐初始角度：

```txt
front three-quarter view
camera slightly above product
lens visible
front screen visible
mount slightly visible
```

也就是前方 30-45 度、略微俯视。

### 第七步：命名对象

对象命名非常重要。不要保留：

```txt
Cube
Cube 1
Cylinder 3
Rectangle 8
```

要改成：

```txt
body_shell
lens_outer_ring
lens_glass
front_screen
top_record_button
mount_adapter
```

后续 React 才能根据对象名绑定热点和事件。

### 第八步：做交互

先做三个基本交互：

```txt
hover lens -> 高亮镜头，显示镜头说明
click lens -> 切换 lens_expanded 状态
click lens again -> 回到 assembled 状态
```

再扩展到：

```txt
hover front_screen
click front_screen
hover mount
click mount
```

不要一开始就做所有模块。先让一个模块闭环。

### 第九步：做状态动画

推荐状态：

```txt
assembled
lens_expanded
screen_expanded
mount_expanded
```

动画规则：

- 同一模块再次点击：收起。
- 点击不同模块：先回 assembled，再展开新模块。
- 展开和收起都要有过渡。
- 展开状态仍然允许拖拽旋转。

### 第十步：发布并接入 React

发布后拿到 Spline URL：

```ts
const scene = {
  provider: 'spline',
  embedMode: 'react-spline',
  sceneUrl: 'https://prod.spline.design/xxx/scene.splinecode'
}
```

React 接入：

```tsx
import Spline from '@splinetool/react-spline'

export function ProductScene() {
  return <Spline scene="https://prod.spline.design/xxx/scene.splinecode" />
}
```

## 6. 如果你已经有 GLB 模型

推荐流程：

```txt
检查授权
-> 导入 Spline
-> 删除不需要的默认对象
-> 检查模型比例
-> 拆分或重命名对象
-> 重设材质
-> 添加灯光和相机
-> 加状态和事件
-> 发布
```

如果导入后只有一个整体 mesh，热点就很难绑定到具体部件。最好在 Blender 或源建模工具里先把部件拆好：

```txt
body_shell
lens_group
front_screen
rear_screen
button_group
mount_group
```

## 7. 如果你只有产品图片

图片不能直接变成高质量 Spline scene。它只能作为参考。

可选路线：

```txt
图片参考 -> 手动建模
图片参考 -> AI 生成粗模型 -> Blender 清理 -> Spline
图片参考 -> 找建模师建模 -> Spline
```

AI 生成 3D 现在可以做草模，但对消费电子产品这种硬表面模型，通常需要人工修。

## 8. 学习路线建议

### 阶段 1：会嵌入

目标：知道 Spline 场景怎么进 React。

练习：

- 找一个 Spline Community scene。
- 用 iframe 嵌入。
- 用 `@splinetool/react-spline` 嵌入。

### 阶段 2：会改场景

目标：知道 Spline 编辑器怎么组织对象。

练习：

- 改对象名。
- 改材质。
- 改灯光。
- 改相机。

### 阶段 3：会做交互

目标：掌握 event 和 state。

练习：

- hover 高亮。
- click 展开。
- click 再次收起。
- 切换不同模块。

### 阶段 4：会导入模型

目标：把外部 GLB/OBJ/FBX 变成 Spline 产品展示。

练习：

- 导入一个授权 GLB。
- 检查层级。
- 重新命名对象。
- 做热点。

### 阶段 5：会从 0 建模

目标：用基础几何体做原创产品。

练习：

- 建一个简单蓝牙音箱。
- 建一个耳机盒。
- 建一个运动相机近似模型。
- 做完整交互和发布。

## 9. 推荐的真实项目分工

如果是公司自己的产品，最稳的是：

```txt
工业设计 / 建模团队
-> 提供 GLB / FBX / OBJ / Blender / CAD
-> 前端或设计师导入 Spline
-> Spline 做网页展示和交互
-> React 接入
```

如果没有建模团队：

```txt
找授权模型
-> Spline 调整
-> 做产品页
```

如果只是学习：

```txt
原创近似模型
-> Spline 学概念
-> 不追求真实产品精度
```

## 10. 参考链接

- Spline 官网：https://spline.design/
- Spline Community：https://app.spline.design/community
- Spline Viewer 文档：https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer
- Spline Code Export 文档：https://docs.spline.design/exporting-your-scene/web/exporting-as-code
- React Spline：https://github.com/splinetool/react-spline
- DJI Osmo Action 6 官方页：https://www.dji.com/osmo-action-6
- DJI Osmo Action 6 规格页：https://www.dji.com/osmo-action-6/specs

