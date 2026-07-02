# Three.js 初学者指南

Three.js 是一个运行在浏览器里的 3D 图形库。它帮你把 WebGL 里繁琐的底层调用包装成更容易理解的对象：场景、相机、几何体、材质、灯光、控制器和加载器。对前端开发者来说，它最大的价值不是“替代 Blender”，而是把 3D 内容变成网页里可以被状态、交互和数据驱动的一部分。

## Three.js 能做什么

### 产品 3D 展示

Three.js 很适合做产品展示页，比如手机、耳机、相机、机械结构、家具或工业设备。你可以加载 glTF / GLB 模型，也可以用基础几何体组合出轻量模型。用户可以拖拽旋转、点击热点、切换材质、查看结构拆解。

### 数据可视化

当数据天然带有空间关系时，Three.js 能把它表现成 3D 地图、网络拓扑、粒子场、空间坐标、建筑群或时间轴装置。它不替代 ECharts 这类图表库，但很适合做更沉浸、更空间化的展示。

### 互动网页体验

Three.js 可以做滚动叙事、鼠标驱动场景、沉浸式首页、动态背景和交互式演示。它的画布可以和普通 React 页面并存，因此适合做“网页 UI + 3D 场景”的组合体验。

### 轻量建模与配置器

你可以用立方体、球体、圆柱、圆锥、平面等基础几何体组合出模型，并把每个零件的 transform、材质、层级关系保存成 JSON。这类能力很适合做教学工具、产品配置器、空间方案预览或参数化建模原型。

### 游戏和仿真原型

Three.js 可以做轻量 Web 游戏、物理仿真、粒子效果和交互原型。它不是完整游戏引擎，但很适合前端团队快速验证一个 3D 互动想法。

### WebXR 入门

Three.js 支持 WebXR，可以作为 AR / VR 网页体验的入口。初学阶段不用急着进入 XR，但理解 Three.js 的 scene、camera、renderer 之后，再学习 XR 会顺很多。

## 核心原理

### Scene：世界容器

`Scene` 是 3D 世界的根容器。模型、灯光、辅助线、粒子、分组对象都会被放进 scene。你可以把它理解成舞台。

### Camera：观察世界的眼睛

`Camera` 决定用户从哪里看这个世界。最常用的是 `PerspectiveCamera`，它符合人眼透视；还有 `OrthographicCamera`，更适合工程图、等距视角和 UI 化场景。

### Renderer：把 3D 画到 canvas

`WebGLRenderer` 负责把 scene 和 camera 的结果画到 `<canvas>`。每一帧通常会调用：

```ts
renderer.render(scene, camera)
```

### Mesh = Geometry + Material

`Geometry` 决定形状，比如立方体、球体、圆柱。`Material` 决定表面，比如颜色、金属度、粗糙度、透明度。`Mesh` 是二者的组合：

```ts
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: '#58d7c5' })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)
```

### Light：让物体有体积感

如果使用 `MeshStandardMaterial` 这类受光材质，就需要灯光。常见灯光包括 `DirectionalLight`、`HemisphereLight`、`PointLight` 和 `AmbientLight`。

### Object3D：所有物体的基础节点

Three.js 里很多对象都继承自 `Object3D`。它们都有 `position`、`rotation`、`scale`，也可以组成父子层级。理解 Object3D，就能理解模型组合、实例化和场景树。

### Render Loop：每帧更新再渲染

3D 场景通常通过 `requestAnimationFrame` 不断更新：

```ts
function animate() {
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

如果你要旋转物体、播放动画、响应控制器阻尼，都需要 render loop。

### Raycaster：把鼠标点进 3D 世界

网页鼠标坐标是 2D，Three.js 世界是 3D。`Raycaster` 会从相机向鼠标方向发射一条射线，判断它击中了哪些物体。点击选择模型、hover 热点、拖拽物体都常用它。

### Controls：让用户操作相机或物体

常用控制器：

- `OrbitControls`：围绕目标点旋转、缩放、平移相机。
- `TransformControls`：对选中物体执行移动、旋转、缩放。

本项目初版建模器就使用这两个控制器。

### Loader：加载外部资产

真实项目常用 `GLTFLoader` 加载 `.glb` 或 `.gltf` 模型，用 `TextureLoader` 加载纹理。初学阶段可以先从基础几何体开始，再进入资产加载。

## 初学者如何使用

1. 先渲染一个立方体，理解 scene、camera、renderer、mesh。
2. 加入灯光和 OrbitControls，让物体有体积感，并且能拖拽观察。
3. 组合多个基础几何体，理解 Object3D、Group 和 transform。
4. 用 Raycaster 点击选择物体。
5. 用 TransformControls 移动、旋转、缩放选中物体。
6. 把模型抽象成 JSON 数据结构，记录 primitive、position、rotation、scale、material。
7. 从 JSON 重新生成 Three.js 场景。
8. 把一个小模型复制为多个 instance，生成更大的场景。

## 和本项目 demo 的对应关系

- 建模画布：`Scene + Camera + WebGLRenderer`。
- 添加几何体：创建 `BoxGeometry`、`SphereGeometry`、`CylinderGeometry`、`ConeGeometry`。
- 属性面板：编辑模型 JSON 中的 transform 和 material。
- 对象树：展示 `ModelDocument.parts`，对应场景中的多个 mesh。
- 点击选择：使用 `Raycaster` 找到命中的 mesh。
- 移动/旋转/缩放：使用 `TransformControls`。
- 生成大场景：把当前 `ModelDocument` 当作 prefab，按 grid、radial、stack 生成多个 instance。
- 渲染预览：把生成后的 instance 转成新的 Three.js group，再放进预览 scene。

## 本项目的进阶实现逻辑

### 为什么要区分“基础尺寸”和“缩放”

基础尺寸描述几何体本身。例如立方体的 `width / height / depth`，圆柱的 `radius / height`，球体的 `radius`。这些字段决定创建 `Geometry` 时的原始尺寸。

`scale` 是 `Object3D` 的变换属性，适合交互式缩放和动画。把两者分开之后，数据会更清楚：

```ts
{
  primitive: 'box',
  dimensions: { width: 2, height: 1, depth: 3 },
  transform: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  }
}
```

这样后续持久化时，既能保存“模型建造时的基础尺寸”，也能保存“用户在场景里对它做过的变换”。

### TransformControls 如何回写数据

Three.js 的 `TransformControls` 会直接修改 mesh 的 `position / rotation / scale`。如果只改 Three.js 对象，不同步回 React state，右侧属性面板下一次更新就会用旧数据重新渲染，导致画布里的改动被还原。

本项目的处理方式是：拖拽结束时读取被控制对象的 transform，再 dispatch 到 reducer：

```ts
onCommitPartTransform(partId, {
  transform: {
    position: [object.position.x, object.position.y, object.position.z],
    rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
    scale: [object.scale.x, object.scale.y, object.scale.z],
  },
})
```

### 为什么生成大场景要基于“已保存组合体”

上方画布是编辑区，用户可能还在试错。生成大场景如果直接读取编辑区，会让预览状态跟着每次细小编辑变化，难以理解。

因此本项目把流程拆成三步：

1. 在上方画布编辑基础零件。
2. 保存为组合体快照。
3. 生成画布读取保存后的组合体，把它作为 prefab 复制成多个 instance。

这也是后续接入数据库时更自然的模型：`SavedModel` 是可复用资产，`GeneratedScene` 是资产的排布和动画方案。

### 生成动画如何工作

生成画布目前支持三种动画：

- `orbit`：整个生成 group 围绕 Y 轴旋转。
- `pulse`：每个 instance 按不同 phase 做轻微缩放。
- `disperse`：每个 instance 从原始位置向外扩散，再回到原位，形成粒子分散感。

动画参数中 `speed` 控制速度，`amplitude` 控制幅度。页面同时检查 `prefers-reduced-motion`，用户偏好减少动效时会停用持续动画。

## 进阶优化方案：React Three Fiber + Drei

初版推荐用原生 Three.js，因为它能让初学者直接看见底层概念：什么时候创建 renderer，什么时候 dispose geometry，什么时候把数据转成 mesh。

当场景复杂到一定程度，可以考虑方案 B：React Three Fiber + Drei。

React Three Fiber 是 Three.js 的 React 渲染器。你可以用 JSX 声明 3D 场景：

```tsx
<Canvas camera={{ position: [4, 4, 6] }}>
  <ambientLight />
  <mesh position={[0, 1, 0]}>
    <boxGeometry />
    <meshStandardMaterial color="#58d7c5" />
  </mesh>
</Canvas>
```

Drei 是常用辅助库，提供 `OrbitControls`、`TransformControls`、`Environment`、`Html`、`Text`、`useGLTF` 等高频能力。

适合使用 R3F + Drei 的场景：

- 项目本身已经是 React，并且 3D 场景需要大量组件复用。
- 你希望把 mesh、灯光、控制器写成 React 组件。
- 你要管理复杂加载状态、悬浮 UI、热点标签或多个 reusable scene block。
- 你已经理解 Three.js 基础概念，不再需要每一步都手动管理 renderer。

代价也要清楚：

- 初学者可能先学到框架抽象，而不是 Three.js 本体。
- 一些底层性能和资源释放问题仍然需要你懂 Three.js。
- 当你需要非常精确地控制渲染循环或 WebGL 状态时，原生 Three.js 更直观。

推荐迁移策略：

1. 保留本项目的 `ModelDocument` 数据结构。
2. 保留 reducer 和 generated scene factory。
3. 把 `useThreeModelerScene` 替换成 R3F 的 `<Canvas>` 组件树。
4. 把 `createMeshFromPart(part)` 的逻辑改成 `<PartMesh part={part} />`。
5. 继续让 React UI 面板编辑同一份模型数据。

这样就能把“数据层”和“渲染层”解耦：初版用原生 Three.js 学原理，进阶版用 R3F + Drei 提升 React 工程效率。

## 官方资料

- [Three.js Manual](https://threejs.org/manual/)
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Editor](https://threejs.org/editor/)
