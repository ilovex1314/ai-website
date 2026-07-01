# Spline Topic 状态记录

更新日期：2026-07-02

## 当前结论

这个 topic 目前定位为：学习 Spline 在产品 3D 展示里的真实工作流，而不是用前端代码或基础盒模型假装完成高精度建模。

前面验证出的关键问题是：直接在 Spline 里手搓 DJI Osmo Action 6 级别的精准模型并不适合作为入门切入点。更合理的路线是先理解 Spline 的 scene、object、material、camera、event、state 和发布方式，再使用授权 GLB/OBJ/FBX 等 3D 模型导入 Spline 完成展示和交互。

## 已完成内容

- 新增 `/topics/spline` 页面入口。
- 新增 Spline 产品展示 feature：
  - `src/features/spline-showcase/SplineProductShowcase.tsx`
  - `src/features/spline-showcase/SplineProductShowcase.css`
  - `src/features/spline-showcase/splineShowcaseData.ts`
  - `src/features/spline-showcase/SplineProductShowcase.test.tsx`
- 生成原创教学 GLB 源资产：
  - `public/models/action-6-inspired/action-6-inspired-study.glb`
  - `public/models/action-6-inspired/local-model.json`
- 新增模型生成脚本：
  - `scripts/generate-action6-inspired-glb.mjs`
  - `npm run model:action6`
- 新增 Spline 学习文档：
  - `docs/spline-3d-beginner-guide.md`
  - `docs/spline-modeling-from-zero.md`

## 已修正的问题

之前错误地把 Spline 默认 starter 发布链接挂到了页面上，导致页面看起来像 Spline 默认模板，而不是 Action 6 相关场景。

现在已移除错误的 starter URL。页面默认回到本地原创 Action 6-inspired 教学模型，不再冒充真实 Spline 发布场景。

## 当前未完成

- 还没有真实可用的 Action 6 Spline scene URL。
- 还没有从 Spline 导出的真实 `scene.splinecode`。
- 还没有完成“授权外部模型 -> Spline 导入 -> Spline 交互状态 -> 发布 -> React 接入”的完整闭环。

## 推荐下一步

1. 从 Spline Community 找一个合适产品展示 scene，用来学习嵌入、相机、材质和事件。
2. 找一个授权 GLB/OBJ/FBX 产品模型，导入 Spline，练习对象命名和材质重设。
3. 在 Spline 中制作 assembled / lens_expanded / screen_expanded / mount_expanded 等状态。
4. 发布或导出真实 scene。
5. 把真实 `sceneUrl` 接回 `splineShowcaseData.ts`。

## 验证记录

最近一次已通过：

```bash
npm test -- src/features/spline-showcase/SplineProductShowcase.test.tsx --run
npm run lint
npm run build
```

